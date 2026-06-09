# src/RAG/api.py  — production-ready refactor
"""
KAPHA RAG API — refactored for production.

Key changes:
- All config via src/RAG/config.py (no os.getenv here)
- Thread-safe session store with asyncio.Lock
- Proper lifespan (not deprecated on_event)
- Distinguishable DB errors vs empty results
- Fixed dead code in chat_with_kapha
- Fixed session expiry bug
- Structured error responses
"""
from __future__ import annotations

import asyncio
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import psycopg2
import psycopg2.pool
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pgvector.psycopg2 import register_vector
from pydantic import BaseModel, field_validator
from sentence_transformers import CrossEncoder, SentenceTransformer

from .config import cfg  # single import

# ── Model Loading ─────────────────────────────────────────────────────────────
print(f"⏳ Loading embedding model ({cfg.embedding.model_name})...")
try:
    embedder = SentenceTransformer(cfg.embedding.model_name)
except Exception as e:
    print(f"❌ Failed to load embedding model: {e}", flush=True)
    raise SystemExit(1)

print("⏳ Loading reranker model...")
try:
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
except Exception as e:
    print(f"❌ Failed to load reranker model: {e}", flush=True)
    raise SystemExit(1)

# ── LLM ───────────────────────────────────────────────────────────────────────
print(f"⏳ Initializing LLM (provider={cfg.llm.provider}, model={cfg.llm.model_name})...")
if cfg.llm.provider == "openai":
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(
        model=cfg.llm.model_name,
        api_key=cfg.llm.openai_api_key,
        temperature=cfg.llm.temperature,
        max_tokens=cfg.llm.max_tokens,
    )
else:
    from langchain_ollama import ChatOllama
    llm = ChatOllama(
        model=cfg.llm.model_name,
        base_url=cfg.llm.ollama_base_url,
        temperature=cfg.llm.temperature,
        num_predict=cfg.llm.max_tokens,
    )

# ── Connection Pool ───────────────────────────────────────────────────────────
_db_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_db_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _db_pool
    if _db_pool is None:
        raise RuntimeError("DB pool not initialized")
    return _db_pool


# ── Session Store ─────────────────────────────────────────────────────────────
_sessions: dict[str, dict] = {}
_session_lock = asyncio.Lock()


async def _get_session(sid: str) -> dict:
    async with _session_lock:
        if sid not in _sessions:
            _sessions[sid] = {
                "cache": {},
                "konteks": "",
                "created_at": datetime.now(),
            }
        return _sessions[sid]


async def _cleanup_expired_sessions() -> int:
    """Remove sessions older than SESSION_TIMEOUT_MINUTES. Returns count removed."""
    timeout_seconds = cfg.server.session_timeout_minutes * 60
    now = datetime.now()
    expired = []

    async with _session_lock:
        for sid, data in _sessions.items():
            created_at = data.get("created_at")
            if not isinstance(created_at, datetime):
                expired.append(sid)
                continue
            if (now - created_at).total_seconds() > timeout_seconds:
                expired.append(sid)
        for sid in expired:
            del _sessions[sid]

    if expired:
        print(f"  [🧹 CLEANUP] Removed {len(expired)} expired sessions")
    return len(expired)


# ── Lifespan (replaces deprecated @app.on_event) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    # Startup
    global _db_pool
    db = cfg.db
    _db_pool = psycopg2.pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=db.max_connections,
        **db.as_psycopg2_dict(),
    )
    print(f"✅ DB pool created (max={db.max_connections})")

    cleanup_task = asyncio.create_task(_cleanup_loop())

    yield  # Application runs

    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    if _db_pool:
        _db_pool.closeall()
    print("✅ DB pool closed")


async def _cleanup_loop():
    while True:
        await asyncio.sleep(600)
        await _cleanup_expired_sessions()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="KAPHA RAG API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.server.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[Unhandled Error] {request.url} → {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred."},
    )


# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message cannot be empty")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 characters)")
        return v

    @field_validator("session_id")
    @classmethod
    def session_id_safe(cls, v: Optional[str]) -> str:
        if v is None:
            return "default"
        if not re.match(r"^[\w\-]{1,64}$", v):
            return "default"
        return v


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    session_id: str
    validation: dict
    
class EmbeddingRequest(BaseModel):
    text: str


# ── Database Helper ───────────────────────────────────────────────────────────
class DatabaseError(Exception):
    """Raised when a database operation fails after all retries."""


def cari_putusan(query_text: str, top_k: int | None = None) -> list[dict]:
    """
    Vector similarity search. Returns sorted list of relevant decisions.
    Raises DatabaseError if the DB is unreachable after retries.
    Returns [] if the query succeeds but no results match.
    """
    if top_k is None:
        top_k = cfg.embedding.top_k

    expanded = _expand_query(query_text)
    vec = embedder.encode(expanded, normalize_embeddings=True).tolist()
    vec_str = "[" + ",".join(f"{v:.8f}" for v in vec) + "]"

    sql = """
        SELECT
            nomor_putusan_pk, nomor_putusan_pp,
            tahun_putusan, jenis_pajak,
            objek_sengketa, preview_sengketa,
            amar_putusan, pertimbangan_hakim,
            argumen_pemohon, argumen_terbanding,
            alasan_keputusan, nilai_sengketa,
            hakim_ketua, dasar_hukum_fiskus,
            1 - (embedding_konten <=> %s::vector) AS skor
        FROM putusan_pajak
        WHERE embedding_konten IS NOT NULL
        ORDER BY embedding_konten <=> %s::vector
        LIMIT %s
    """
    cols = [
        "nomor_pk", "nomor_pp", "tahun", "jenis_pajak",
        "objek_sengketa", "preview_sengketa",
        "amar", "pertimbangan", "argumen_pemohon", "argumen_terbanding",
        "alasan", "nilai_sengketa", "hakim_ketua", "dasar_hukum_fiskus",
        "skor",
    ]

    pool = _get_db_pool()
    MAX_RETRIES = 3

    for attempt in range(MAX_RETRIES):
        conn = None
        try:
            conn = pool.getconn()
            register_vector(conn)
            cur = conn.cursor()
            cur.execute(sql, (vec_str, vec_str, top_k))
            rows = cur.fetchall()
            cur.close()
            pool.putconn(conn)
            conn = None

            results = [dict(zip(cols, r)) for r in rows]

            if not results:
                return []

            def _candidate_text(p: dict) -> str:
                parts = [p.get("objek_sengketa") or "", p.get("pertimbangan") or ""]
                return " ".join(x[:500] for x in parts if x).strip()

            pairs = [(query_text, _candidate_text(p)) for p in results]
            scores = reranker.predict(pairs)

            for i, p in enumerate(results):
                p["skor_rerank"] = float(scores[i])

            results.sort(key=lambda x: x["skor_rerank"], reverse=True)
            return results[:5]

        except psycopg2.OperationalError as e:
            if conn:
                pool.putconn(conn, close=True)
                conn = None
            if attempt == MAX_RETRIES - 1:
                raise DatabaseError(f"DB unreachable after {MAX_RETRIES} attempts: {e}") from e
            wait = 2 ** attempt
            print(f"  [⚠️ DB retry {attempt + 1}/{MAX_RETRIES}] waiting {wait}s...")
            time.sleep(wait)
        except Exception:
            if conn:
                pool.putconn(conn)
            raise
        finally:
            if conn:
                pool.putconn(conn)

    return []


# ── Chat Endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id
    sess = await _get_session(session_id)
    cache: dict[int, dict] = sess["cache"]
    pesan = req.message

    compare_indices = _detect_compare(pesan)
    is_compare = bool(compare_indices) and bool(cache)
    is_followup = _detect_followup(pesan, bool(cache))

    relevan_list: list[dict] = []
    answer: str

    if is_compare:
        if not compare_indices:
            compare_indices = list(cache.keys())
        target = {i: cache[i] for i in compare_indices if i in cache}
        if not target:
            return ChatResponse(
                answer="Putusan yang dimaksud tidak ada di hasil pencarian sebelumnya. Coba tanya topik dulu ya!",
                sources=[], session_id=session_id,
                validation={"valid": [], "halu": [], "total_disebut": 0, "is_clean": True},
            )
        konteks = _format_konteks(list(target.values()))
        nomor_list = ", ".join(f"[{i}] {_nomor_putusan(p)}" for i, p in target.items())
        prompt_compare = (
            f"Tolong bandingkan secara mendalam putusan berikut: {nomor_list}. "
            f"Jawab dalam Bahasa Indonesia, narasi mengalir, highlight perbedaan kunci."
        )
        answer = _chat_with_kapha(pesan, konteks + "\n\n" + prompt_compare)
        relevan_list = list(target.values())

    elif is_followup:
        indices = [int(n) for n in re.findall(r"\b([1-9]|10)\b", pesan)]
        target = {i: cache[i] for i in indices if i in cache} if indices else cache

        if not target:
            is_followup = False
        else:
            konteks = _format_konteks(list(target.values()))
            answer = _chat_with_kapha(pesan, konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia.")
            relevan_list = list(target.values())

    if not is_compare and not is_followup:
        try:
            putusan_list = cari_putusan(pesan)
        except DatabaseError as e:
            print(f"  [❌ DB Error] {e}")
            raise HTTPException(
                status_code=503,
                detail="Database is temporarily unavailable. Please try again.",
            )

        putusan_list = _filter_by_amar_intent(pesan, putusan_list)
        relevan_list = [
            p for p in putusan_list
            if p.get("skor_rerank", 0) >= cfg.embedding.relevance_threshold
        ]
        if not relevan_list and putusan_list:
            relevan_list = putusan_list[:2]

        async with _session_lock:
            sess["cache"] = {i: p for i, p in enumerate(relevan_list, 1)}

        konteks = _format_konteks(relevan_list)
        if not konteks:
            return ChatResponse(
                answer="Mohon maaf, tidak ada putusan yang relevan dengan pertanyaan itu di database. Bisa coba diperjelas? 🙏",
                sources=[], session_id=session_id,
                validation={"valid": [], "halu": [], "total_disebut": 0, "is_clean": True},
            )
        answer = _chat_with_kapha(pesan, konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia.")

    nomor_disebut = _ekstrak_nomor(answer)
    validation = _validasi_nomor(nomor_disebut)
    if validation.get("halu"):
        answer = _tambah_peringatan(answer, validation["halu"])

    sources = [
        {
            "nomor": _nomor_putusan(p),
            "jenis_pajak": p.get("jenis_pajak") or "Tidak tersedia",
            "amar": p.get("amar") or "Tidak tersedia",
            "tahun": p.get("tahun") or "Tidak tersedia",
            "skor": round(p.get("skor", 0), 3),
        }
        for p in relevan_list
    ]

    return ChatResponse(
        answer=answer, sources=sources,
        session_id=session_id, validation=validation
    )


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "llm_provider": cfg.llm.provider,
        "model": cfg.llm.model_name,
        "embedding": cfg.embedding.model_name,
    }
    
@app.post("/embedding")
async def create_embedding(req: EmbeddingRequest):
    try:
        embedding = embedder.encode(
            req.text,
            normalize_embeddings=True
        )

        return {
            "embedding": embedding.tolist(),
            "dimension": len(embedding)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal membuat embedding: {str(e)}"
        )


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    if not re.match(r"^[\w\-]{1,64}$", session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    async with _session_lock:
        _sessions.pop(session_id, None)
    return {"status": "ok", "session_id": session_id}


@app.post("/validate")
async def validate_teks(body: dict):
    """Endpoint manual untuk testing & evaluasi halusinasi. Body: { "teks": "..." }"""
    teks = body.get("teks", "")
    if not teks:
        raise HTTPException(status_code=422, detail="Field 'teks' wajib diisi.")
    nomor_set = _ekstrak_nomor(teks)
    validation = _validasi_nomor(nomor_set)
    return {"input_length": len(teks), "nomor_ditemukan": list(nomor_set), **validation}


@app.get("/session/{session_id}")
async def lihat_session(session_id: str):
    """Lihat isi cache session — berguna untuk debug follow-up."""
    sess = await _get_session(session_id)
    cache = sess.get("cache", {})
    return {
        "session_id": session_id,
        "jumlah_putusan_di_cache": len(cache),
        "putusan": [
            {
                "index": i,
                "nomor": _nomor_putusan(p),
                "amar": _safe(p.get("amar")),
                "jenis_pajak": _safe(p.get("jenis_pajak")),
            }
            for i, p in cache.items()
        ],
    }


class PutusanDetail(BaseModel):
    nomor: str
    amar: str
    jenis_pajak: str
    upaya_hukum: str
    pengadilan: str
    tahun_pajak: str
    tanggal_putusan: str
    negara_lawan_transaksi: Optional[str] = None
    nilai_sengketa: Optional[str] = None
    pemohon: str
    terbanding: str
    hakim_ketua: Optional[str] = None
    hakim_anggota: Optional[list[str]] = None
    preview_sengketa: Optional[str] = None
    objek_sengketa: Optional[str] = None
    pos_koreksi: Optional[str] = None
    argumen_pemohon: Optional[str] = None
    argumen_terbanding: Optional[str] = None
    dasar_hukum_fiskus: Optional[str] = None
    alat_bukti: Optional[str] = None
    pertimbangan_hakim: Optional[str] = None
    alasan_putusan: Optional[str] = None
    amar_putusan: Optional[str] = None


@app.get("/putusan/{nomor:path}", response_model=PutusanDetail)
async def get_putusan_detail(nomor: str):
    """Ambil detail lengkap satu putusan berdasarkan nomor putusan."""
    pool = _get_db_pool()
    conn = None
    try:
        conn = pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                nomor_putusan,
                amar,
                jenis_pajak,
                upaya_hukum,
                pengadilan,
                tahun_pajak::text,
                to_char(tanggal_putusan, 'DD Month YYYY'),
                negara_lawan_transaksi,
                nilai_sengketa::text,
                pemohon,
                terbanding,
                hakim_ketua,
                hakim_anggota,
                preview_sengketa,
                objek_sengketa,
                pos_koreksi,
                argumen_pemohon,
                argumen_terbanding,
                dasar_hukum_fiskus,
                alat_bukti,
                pertimbangan_hakim,
                alasan_putusan,
                amar_putusan
            FROM putusan
            WHERE nomor_putusan = %s
            LIMIT 1
        """, (nomor,))
        row = cur.fetchone()
        cur.close()
        pool.putconn(conn)
        conn = None

        if not row:
            raise HTTPException(status_code=404, detail=f"Putusan '{nomor}' tidak ditemukan")

        (
            nomor_db, amar, jenis_pajak, upaya_hukum, pengadilan,
            tahun_pajak, tanggal_putusan, negara, nilai_sengketa,
            pemohon, terbanding, hakim_ketua, hakim_anggota,
            preview_sengketa, objek_sengketa, pos_koreksi,
            argumen_pemohon, argumen_terbanding, dasar_hukum_fiskus,
            alat_bukti, pertimbangan_hakim, alasan_putusan, amar_putusan,
        ) = row

        if isinstance(hakim_anggota, str):
            hakim_anggota = [h.strip() for h in hakim_anggota.split(",") if h.strip()]
        elif hakim_anggota is None:
            hakim_anggota = []

        return PutusanDetail(
            nomor=nomor_db, amar=amar or "", jenis_pajak=jenis_pajak or "",
            upaya_hukum=upaya_hukum or "", pengadilan=pengadilan or "",
            tahun_pajak=tahun_pajak or "", tanggal_putusan=tanggal_putusan or "",
            negara_lawan_transaksi=negara, nilai_sengketa=nilai_sengketa,
            pemohon=pemohon or "", terbanding=terbanding or "",
            hakim_ketua=hakim_ketua, hakim_anggota=hakim_anggota,
            preview_sengketa=preview_sengketa, objek_sengketa=objek_sengketa,
            pos_koreksi=pos_koreksi, argumen_pemohon=argumen_pemohon,
            argumen_terbanding=argumen_terbanding, dasar_hukum_fiskus=dasar_hukum_fiskus,
            alat_bukti=alat_bukti, pertimbangan_hakim=pertimbangan_hakim,
            alasan_putusan=alasan_putusan, amar_putusan=amar_putusan,
        )

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            pool.putconn(conn, close=True)
            conn = None
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            pool.putconn(conn)




def _nomor_putusan(p: dict) -> str:
    return (p.get("nomor_pk") or p.get("nomor_pp") or "Nomor tidak tersedia").strip()


def _safe(value, fallback: str = "Tidak tersedia") -> str:
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback


def _expand_query(query: str) -> str:
    expansions = {
        r"\brugi\b": "rugi kerugian losses negatif comparable loss-making",
        r"\bpembanding\b": "pembanding comparable data kesebandingan loss-making",
        r"\btransfer pricing\b": "transfer pricing harga transfer afiliasi hubungan istimewa TP",
        r"\bbut\b": "BUT Bentuk Usaha Tetap permanent establishment",
        r"\bp3b\b": "P3B tax treaty perjanjian penghindaran pajak berganda",
        r"\bppn\b": "PPN Pajak Pertambahan Nilai",
        r"\bpph\b": "PPh Pajak Penghasilan",
        r"\broyalti\b": "royalti royalty hak cipta lisensi",
    }
    parts = [query]
    for pattern, replacement in expansions.items():
        if re.search(pattern, query, re.IGNORECASE):
            parts.append(replacement)
    return " ".join(parts)


SYSTEM_PROMPT = """
Kamu adalah KAPHA, Senior Konsultan Pajak Internasional, sangat analitis, presisi, dan ZERO-HALUSINASI.

Semua jawaban HARUS hanya menggunakan informasi yang tersedia dalam konteks. Dilarang menebak, menambahkan, atau mengisi celah informasi.

════════════════════════════════════════════
ATURAN UTAMA
════════════════════════════════════════════
1. IDENTITAS PUTUSAN
   - Gunakan hanya nomor putusan yang tersedia di konteks.
   - Jangan menyebut "Putusan 1, 2, dst" atau membuat nomor sendiri.
   - Jika nomor putusan tidak ada → jangan sebut sama sekali.

2. ZERO-HALUSINASI
   - Gunakan hanya fakta eksplisit.
   - Jangan menambahkan: nama perusahaan, angka, margin, kronologi, hubungan afiliasi, metode TP spesifik.
   - Jika data tidak tersedia → tulis: "Data tidak menyebutkan hal tersebut secara eksplisit."

3. GROUNDING
   - Semua klaim harus bisa ditelusuri ke konteks.
   - Jangan pakai pengetahuan umum jika tidak ada di data.

4. KONSISTENSI LOGIKA
   - Pisahkan dengan jelas:
     • Alasan koreksi Fiskus
     • Pertimbangan hakim
     • Hasil akhir
   - Jangan buat hubungan sebab-akibat jika tidak didukung data.

5. BAHASA & GAYA
   - Bahasa Indonesia profesional, tajam, gaya briefing senior.
   - Minim repetisi, hindari template kaku.

════════════════════════════════════════════
KERANGKA ANALISIS
════════════════════════════════════════════
1. SEBAB SENGKETA
   - Jelaskan dasar koreksi Fiskus hanya jika ada di data.
   - Identifikasi isu terkait:
     • Transfer Pricing → metode & ALP (jika disebut)
     • P3B → beneficial ownership / treaty abuse (jika disebut)
     • BUT → time test / atribusi laba (jika disebut)

2. ANALISIS HAKIM
   - Bedah pertimbangan hakim:
     • Validitas metode (jika disebut)
     • Validitas data pembanding (jika disebut)
     • Kelemahan argumen masing-masing pihak
   - Jika detail tidak tersedia → tulis: "Data tidak menyebutkan hal tersebut secara eksplisit."

3. HASIL AKHIR
   - Tegaskan secara eksplisit:
     → Hakim MEMBATALKAN koreksi Fiskus (WP menang)
     → Hakim MEMPERTAHANKAN koreksi Fiskus (WP kalah)
   - Jangan ambigu.

4. SINTESIS (jika >1 putusan)
   - Tarik pola umum tanpa menambahkan fakta baru.

════════════════════════════════════════════
ISU KHUSUS: RUGI / LOSS
════════════════════════════════════════════
- Jika ada kata "rugi", "loss", "negatif", "loss-making": jelaskan penilaian hakim.
- Jika tidak ada → tulis: "Dalam data putusan ini, kondisi rugi tidak disebutkan secara eksplisit."

════════════════════════════════════════════
PERILAKU JIKA DATA TERBATAS
════════════════════════════════════════════
- Jawab tetap analitis.
- Fokus hanya pada fakta yang tersedia.
- Jelaskan keterbatasan secara natural.
- Jangan overclaim.

════════════════════════════════════════════
OUTPUT DIHARAPKAN
════════════════════════════════════════════
- Narasi mengalir, profesional, analitis, zero-halusinasi.
- Setiap klaim berbasis fakta.
- Pisahkan alasan Fiskus, pertimbangan hakim, dan hasil akhir secara jelas.
"""


def _chat_with_kapha(user_query: str, context: str) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage

    prompt = f"""
BERIKUT ADALAH DATA PUTUSAN SEBAGAI REFERENSI:
{context}

PERTANYAAN: {user_query}

PERATURAN JAWABAN:
1. Gunakan Bahasa Indonesia yang santai tapi tajam (Gaya Senior Konsultan).
2. Jika data di atas menggunakan Bahasa Inggris, terjemahkan poin pentingnya ke Bahasa Indonesia.
3. Jangan menjawab dalam Bahasa Inggris!

TUGAS ANALISIS:
- Sampaikan jawaban dalam bentuk NARASI/PARAGRAF mengalir.
- Gunakan Nomor Putusan asli (PK/PP) sebagai referensi dalam kalimat.
- Jelaskan SEBAB (kenapa dikoreksi) dan AKIBAT (hasil putusan/amar hakim).
- Berikan KESIMPULAN di akhir jika terdapat pola yang sama antar putusan.
- Jawab FULL dalam Bahasa Indonesia yang tajam.
"""
    messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    return response.content


def _format_konteks(putusan_list: list[dict]) -> str:
    if not putusan_list:
        return ""
    nomor_valid = [_nomor_putusan(p) for p in putusan_list]
    header = (
        f"[TOTAL DATA TERSEDIA: {len(putusan_list)} PUTUSAN]\n"
        f"NOMOR PUTUSAN YANG BOLEH DISEBUT (HANYA INI, DILARANG SEBUT NOMOR LAIN):\n"
        + "\n".join(f"- {n}" for n in nomor_valid)
        + "\n\n"
    )
    return header + "\n\n".join(_format_satu(p, i) for i, p in enumerate(putusan_list, 1))


def _format_satu(p: dict, index: int) -> str:
    pertimbangan = _safe(p.get("pertimbangan"))
    ada_rugi = any(k in pertimbangan.lower() for k in ["rugi", "loss", "negatif", "loss-making"])
    rugi_flag = "⚠️ ADA FAKTA RUGI/LOSS" if ada_rugi else "Tidak ada fakta rugi eksplisit"

    rerank = p.get("skor_rerank")
    skor_display = f"{rerank:.2f} (rerank)" if rerank is not None else f"{p.get('skor', 0):.0%}"
    return f"""
[PUTUSAN {index} | Relevansi: {skor_display}]
Nomor          : {_nomor_putusan(p)}
Tahun          : {_safe(p.get('tahun'))}
Jenis Pajak    : {_safe(p.get('jenis_pajak'))}
Objek Sengketa : {_safe(p.get('objek_sengketa'))}
Amar Putusan   : {_safe(p.get('amar'))}
Nilai Sengketa : {_safe(p.get('nilai_sengketa'))}
Hakim Ketua    : {_safe(p.get('hakim_ketua'))}
Fakta Rugi     : {rugi_flag}
Dasar Hukum    : {_safe(p.get('dasar_hukum_fiskus'))[:400]}
Argumen Pemohon: {_safe(p.get('argumen_pemohon'))[:300]}
Argumen Fiskus : {_safe(p.get('argumen_terbanding'))[:300]}
Pertimbangan   : {pertimbangan[:800]}
Alasan Putus   : {_safe(p.get('alasan'))[:500]}
""".strip()


def _filter_by_amar_intent(query: str, putusan_list: list[dict]) -> list[dict]:
    q = query.lower()
    KABUL = ["dikabulkan", "kabul", "menang", "diterima", "dimenangkan",
             "wp menang", "wajib pajak menang", "berhasil", "koreksi dibatalkan"]
    TOLAK = ["ditolak", "kalah", "djp menang", "fiskus menang",
             "koreksi diterima", "koreksi dipertahankan"]
    if any(k in q for k in KABUL):
        f = [p for p in putusan_list if any(k in (p.get("amar") or "").lower()
             for k in ["kabul", "menerima", "membatalkan", "batal"])]
        return f or putusan_list
    if any(k in q for k in TOLAK):
        f = [p for p in putusan_list if any(k in (p.get("amar") or "").lower()
             for k in ["tolak", "menolak"])]
        return f or putusan_list
    return putusan_list


_FOLLOWUP_EXPLICIT = [
    "yang tadi", "yang itu", "tadi", "itu tadi",
    "putusan tadi", "putusan itu", "nomor itu",
    "yang pertama", "yang kedua", "yang ketiga", "yang keempat", "yang kelima",
    "yang ke-1", "yang ke-2", "yang ke-3", "yang ke-4", "yang ke-5",
    "lebih dalam", "elaborasi", "lebih lanjut", "yang ke1", "yang ke2", "yang ke3", "yang ke4", "yang ke5",
    "ke-1", "ke-2", "ke-3", "ke-4", "ke-5",
    "ke1", "ke2", "ke3", "ke4", "ke5",
    "nomor 1", "nomor 2", "nomor 3", "nomor 4", "nomor 5",
]

_FOLLOWUP_CONTEXTUAL = [
    "dari daftar", "dari hasil", "dari putusan tersebut", "dari putusan tadi",
    "dari putusan di atas", "dari putusan yang",
    "putusan-putusan tersebut", "putusan-putusan tadi",
    "putusan yang dikemukakan", "putusan yang disebutkan",
    "putusan yang kalah", "putusan yang menang",
    "di antara putusan", "dari kelima", "dari keempat", "dari ketiga",
    "salah satu", "masing-masing",
]

_FOLLOWUP_ANALYTIC = [
    "apa alasan", "alasan utama", "apa yang menjadi",
    "dokumen apa", "bukti apa", "argumen apa",
    "bagaimana hakim", "apa pertimbangan",
    "kenapa djp", "mengapa djp", "kenapa fiskus", "mengapa fiskus",
    "kenapa hakim", "mengapa hakim",
    "siapa hakim", "berapa nilai",
    "apakah ada", "apakah semua",
    "pola apa", "kesimpulan",
    "jelaskan", "ceritakan", "uraikan",
]

_NEW_TOPIC_SIGNALS = [
    "transfer pricing", "p3b", "but", "pph 26", "pph badan", "ppn",
    "beneficial owner", "royalti", "dividen", "tnmm", "cup method", "rpm",
    "arm's length", "hubungan istimewa", "permanent establishment",
    "treaty shopping", "withholding tax", "management fee",
]

_COMPARE_KEYWORDS = [
    "bandingkan", "compare", "banding", "perbandingan",
    "bedakan", " vs ", "versus",
]


def _detect_followup(text: str, has_cache: bool) -> bool:
    if not has_cache:
        return False
    t = text.lower()
    if any(k in t for k in _NEW_TOPIC_SIGNALS):
        return False
    if any(k in t for k in _FOLLOWUP_EXPLICIT):
        return True
    if any(k in t for k in _FOLLOWUP_CONTEXTUAL):
        return True
    has_index = bool(re.search(r"\b([1-5])\b", t))
    is_analytic = any(k in t for k in _FOLLOWUP_ANALYTIC)
    if is_analytic and has_index:
        return True
    return False


def _detect_compare(text: str) -> list[int]:
    t = text.lower()
    if not any(k in t for k in _COMPARE_KEYWORDS):
        return []
    return [int(n) for n in re.findall(r"\b([1-9]|10)\b", t)]


_PATTERN_PK = re.compile(r"\b\d{1,5}/(?:B/)?PK/(?:Pjk|PJK|B|PB)/\d{4}\b", re.IGNORECASE)
_PATTERN_PP = re.compile(r"\bPUT[.\-]?\d{4,7}/PP/[\w.]+/\d+/\d{4}\b", re.IGNORECASE)


def _ekstrak_nomor(teks: str) -> set[str]:
    hasil = set()
    for pat in [_PATTERN_PK, _PATTERN_PP]:
        for m in pat.finditer(teks):
            hasil.add(re.sub(r"\s+", "", m.group()).upper())
    return hasil


def _normalize(nomor: str) -> str:
    return re.sub(r"[\s\-./]", "", nomor).lower()


def _validasi_nomor(nomor_set: set[str]) -> dict:
    if not nomor_set:
        return {"valid": [], "halu": [], "total_disebut": 0, "is_clean": True}
    pool = _get_db_pool()
    conn = None
    try:
        conn = pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT nomor_putusan_pk, nomor_putusan_pp FROM putusan_pajak")
        rows = cur.fetchall()
        cur.close()
        pool.putconn(conn)
        conn = None

        db_lookup = {}
        for pk, pp in rows:
            if pk:
                db_lookup[_normalize(pk)] = str(pk).strip()
            if pp:
                db_lookup[_normalize(pp)] = str(pp).strip()

        valid, halu = [], []
        for nomor in nomor_set:
            if _normalize(nomor) in db_lookup:
                valid.append({"disebut": nomor, "db": db_lookup[_normalize(nomor)]})
            else:
                halu.append(nomor)
        return {"valid": valid, "halu": halu, "total_disebut": len(nomor_set), "is_clean": not halu}
    except Exception as e:
        print(f"  [Validator Error] {e}")
        if conn:
            pool.putconn(conn)
        return {"valid": [], "halu": [], "total_disebut": len(nomor_set), "is_clean": True, "error": str(e)}


def _tambah_peringatan(answer: str, halu_list: list[str]) -> str:
    if not halu_list:
        return answer
    daftar = "\n".join(f"  • {n}" for n in halu_list)
    return (
        answer
        + f"\n\n---\n"
        + f"⚠️ **Peringatan Validasi:** {len(halu_list)} nomor putusan yang disebut "
        + f"**tidak ditemukan** di database dan kemungkinan merupakan halusinasi:\n"
        + f"{daftar}\n"
        + f"Mohon verifikasi manual sebelum digunakan."
    )