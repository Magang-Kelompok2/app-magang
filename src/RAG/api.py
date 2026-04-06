import re
import os
import psycopg2
import time
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional
from datetime import datetime, timedelta
import asyncio

load_dotenv()

# ── KONFIGURASI ───────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "alpha123"),
    "user":     os.getenv("DB_USER", "alpha123"),
    "password": os.getenv("DB_PASS", "alpha123"),
    "port":     int(os.getenv("DB_PORT", 5432)),
}
TOP_K          = int(os.getenv("RAG_TOP_K", 5))
MODEL_NAME     = os.getenv("MODEL_NAME", "llama3")
BASE_URL       = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL    = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
ALLOWED_ORIGIN = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
# ─────────────────────────────────────────────────────────────────────────────

print(f"⏳ Loading embedding model ({EMBED_MODEL})...")
embedder = SentenceTransformer(EMBED_MODEL)

print(f"⏳ Connecting to {MODEL_NAME} at {BASE_URL}...")
# llm = ChatOllama(
#     model=MODEL_NAME,
#     base_url=BASE_URL,
#     temperature=0.3,
#     num_predict=1500,
#     repeat_penalty=1.3,
#     repeat_last_n=128,
# )
llm = ChatOpenAI(
    model=os.getenv("MODEL_NAME", "gpt-4o-mini"),
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.3,
    max_tokens=1500,
)
# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="KAPHA RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    session_id: str
    validation: dict

# ── Session Store ─────────────────────────────────────────────────────────────
# Setiap session menyimpan:
#   "cache"   : {1: putusan_dict, 2: ...}  ← hasil retrieval terakhir
#   "konteks" : string context terakhir    ← dipakai ulang untuk follow-up
#
# Untuk production banyak user → ganti dengan Redis.

_sessions: dict[str, dict] = {}
SESSION_TIMEOUT_MINUTES = 60  # Session expire setelah 60 menit

def _get_session(sid: str) -> dict:
    if sid not in _sessions:
        _sessions[sid] = {
            "cache": {}, 
            "konteks": "",
            "created_at": datetime.now()
        }
    return _sessions[sid]

def _cleanup_expired_sessions():
    """Hapus session yang sudah expired."""
    now = datetime.now()
    expired_sids = []
    
    for sid, data in _sessions.items():
        age = (now - data.get("created_at", now)).total_seconds()
        if age > SESSION_TIMEOUT_MINUTES * 60:
            expired_sids.append(sid)
    
    for sid in expired_sids:
        del _sessions[sid]
        print(f"  [🧹 CLEANUP] Session {sid} dihapus (expired)")
    
    return len(expired_sids)

# Jalankan cleanup setiap 10 menit
@app.on_event("startup")
async def start_cleanup_task():
    async def cleanup_loop():
        while True:
            await asyncio.sleep(600)  # 10 menit
            _cleanup_expired_sessions()
    
    asyncio.create_task(cleanup_loop())

# ── PROMPTS ───────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
Kamu adalah KAPHA, Senior Konsultan Pajak Internasional yang santai tapi tajam.

PRINSIP JAWABAN (WAJIB):
1. NO TEMPLATE: Dilarang keras menggunakan nomor urut (Putusan 1, 2, dst) atau nomor palsu (123456). Gunakan NOMOR PUTUSAN ASLI dari data.
2. AMAR PUTUSAN: WAJIB menyatakan apakah Hakim MENERIMA (Membatalkan koreksi) atau MENOLAK (Mempertahankan koreksi) argumen Fiskus/WP.
3. ANTI-REPETISI: Jika ada beberapa putusan dengan pola sengketa yang mirip, GABUNGKAN narasinya menjadi satu kesimpulan yang padat. Jangan mengulang kalimat pembuka yang sama.
4. ISU RUGI: Cari fakta 'rugi'/'loss'. Jika tidak ada, sampaikan secara natural bahwa kondisi rugi tidak disebutkan eksplisit. Jangan ngarang cerita rugi.
5. NO HALU: Jangan sebut DGT Form/SKD jika sengketa murni Transfer Pricing.

MATERIIL:
- P3B: Fokus pada Beneficial Ownership, Treaty Abuse, dan validitas SKD.
- BUT: Fokus pada Time Test atau atribusi laba.
- Transfer Pricing: Fokus pada Metode (CUP, RPM, TNMM) dan Arm's Length Principle.

GAYA: Briefing senior ke junior. Gunakan Bahasa Indonesia yang teknis, profesional, dan to-the-point.
"""

# ── HELPERS ───────────────────────────────────────────────────────────────────
def safe(value, fallback="Tidak tersedia") -> str:
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback

def expand_query(query: str) -> str:
    expansions = {
        r"\brugi\b":              "rugi kerugian losses negatif",
        r"\bpembanding\b":        "pembanding comparable data kesebandingan",
        r"\btransfer pricing\b":  "transfer pricing harga transfer afiliasi hubungan istimewa TP",
        r"\bbut\b":               "BUT Bentuk Usaha Tetap permanent establishment",
        r"\bp3b\b":               "P3B tax treaty perjanjian penghindaran pajak berganda",
        r"\bppn\b":               "PPN Pajak Pertambahan Nilai",
        r"\bpph\b":               "PPh Pajak Penghasilan",
        r"\bpbb\b":               "PBB Pajak Bumi Bangunan",
        r"\bdividend\b":          "dividen dividend pembagian laba",
        r"\broyalti\b":           "royalti royalty hak cipta lisensi",
    }
    expanded = query
    for pattern, replacement in expansions.items():
        if re.search(pattern, query, re.IGNORECASE):
            expanded = f"{query} {replacement}"
            break
    return expanded

def filter_by_amar_intent(query: str, putusan_list: list[dict]) -> list[dict]:
    """Filter hasil retrieval berdasarkan intent verdict di query."""
    q = query.lower()

    KABUL_KEYWORDS = ["dikabulkan", "kabul", "menang", "diterima", "dimenangkan",
                      "wp menang", "wajib pajak menang", "berhasil", "koreksi dibatalkan"]
    TOLAK_KEYWORDS = ["ditolak", "kalah", "djp menang", "fiskus menang",
                      "koreksi diterima", "koreksi dipertahankan"]

    if any(k in q for k in KABUL_KEYWORDS):
        filtered = [
            p for p in putusan_list
            if any(k in (p.get("amar") or "").lower()
                   for k in ["kabul", "menerima", "membatalkan", "batal"])
        ]
        return filtered if filtered else putusan_list  # fallback jika kosong

    if any(k in q for k in TOLAK_KEYWORDS):
        filtered = [
            p for p in putusan_list
            if any(k in (p.get("amar") or "").lower()
                   for k in ["tolak", "menolak"])
        ]
        return filtered if filtered else putusan_list

    return putusan_list

def nomor_putusan(p: dict) -> str:
    return safe(p.get("nomor_pk") or p.get("nomor_pp"), "Nomor tidak tersedia")

def format_satu(p: dict, index: int) -> str:
    return f"""
[PUTUSAN {index} | Relevansi: {p.get('skor', 0):.0%}]
Nomor          : {nomor_putusan(p)}
Tahun          : {safe(p.get('tahun'))}
Jenis Pajak    : {safe(p.get('jenis_pajak'))}
Objek Sengketa : {safe(p.get('objek_sengketa'))}
Amar Putusan   : {safe(p.get('amar'))}
Nilai Sengketa : {safe(p.get('nilai_sengketa'))}
Hakim Ketua    : {safe(p.get('hakim_ketua'))}
Dasar Hukum    : {safe(p.get('dasar_hukum_fiskus'))[:500]}
Argumen Pemohon: {safe(p.get('argumen_pemohon'))[:600]}
Argumen Fiskus : {safe(p.get('argumen_terbanding'))[:600]}
Pertimbangan   : {safe(p.get('pertimbangan'))[:2000]}
Alasan Putus   : {safe(p.get('alasan'))[:800]}
""".strip()

def format_konteks(putusan_list: list[dict]) -> str:
    if not putusan_list:
        return ""
    header = f"[TOTAL DATA TERSEDIA: {len(putusan_list)} PUTUSAN — JANGAN SEBUT NOMOR DI LUAR DAFTAR INI]\n\n"
    return header + "\n\n".join(format_satu(p, i) for i, p in enumerate(putusan_list, 1))
# ── FOLLOW-UP & COMPARE DETECTION ────────────────────────────────────────────
# Strategi deteksi follow-up:
#   Layer 1 — Kata eksplisit (pasti follow-up)
#   Layer 2 — Frasa kontekstual (merujuk ke "hasil" / "daftar" sebelumnya)
#   Layer 3 — Pertanyaan analitik pendek tanpa topik baru + ada cache aktif

# Layer 1: kata yang selalu merujuk ke sesi sebelumnya
_FOLLOWUP_EXPLICIT = [
    "yang tadi", "yang itu", "tadi", "itu tadi",
    "putusan tadi", "putusan itu", "nomor itu",
    "yang pertama", "yang kedua", "yang ketiga", "yang keempat", "yang kelima",
    "yang ke-1", "yang ke-2", "yang ke-3", "yang ke-4", "yang ke-5",
    "lebih dalam", "elaborasi", "lebih lanjut", "yang ke1", "yang ke2", "yang ke3", "yang ke4", "yang ke5",
    "ke-1", "ke-2", "ke-3", "ke-4", "ke-5",
    "ke1", "ke2", "ke3", "ke4", "ke5",
    "nomor 1", "nomor 2", "nomor 3", "nomor 4", "nomor 5"
]

# Layer 2: frasa yang merujuk ke "daftar/hasil" sebelumnya
_FOLLOWUP_CONTEXTUAL = [
    "dari daftar", "dari hasil", "dari putusan tersebut", "dari putusan tadi",
    "dari putusan di atas", "dari putusan yang",
    "putusan-putusan tersebut", "putusan-putusan tadi",
    "putusan yang dikemukakan", "putusan yang disebutkan",
    "putusan yang kalah", "putusan yang menang",
    "di antara putusan", "dari kelima", "dari keempat", "dari ketiga",
    "salah satu", "masing-masing",
]

# Layer 3: pertanyaan analitik yang implisit merujuk ke konteks aktif
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

_COMPARE_KEYWORDS = [
    "bandingkan", "compare", "banding", "perbandingan",
    "bedakan", " vs ", "versus",
]

def _detect_followup(text: str, has_cache: bool) -> bool:
    """
    True jika pesan terdeteksi sebagai follow-up dari hasil sebelumnya.
    has_cache: apakah session punya cache aktif.
    """
    if not has_cache:
        return False  # tidak ada cache → mustahil follow-up

    t = text.lower()

    # Layer 1: eksplisit → langsung True
    if any(k in t for k in _FOLLOWUP_EXPLICIT):
        return True

    # Layer 2: kontekstual → langsung True
    if any(k in t for k in _FOLLOWUP_CONTEXTUAL):
        return True

    # Layer 3: analitik + ada angka index (1-5) → kemungkinan besar follow-up
    has_index   = bool(re.search(r'\b([1-5])\b', t))
    is_analytic = any(k in t for k in _FOLLOWUP_ANALYTIC)
    if is_analytic:
        return True  # pertanyaan analitik apapun dianggap follow-up jika ada cache
    if has_index:
        return True  # ada angka 1-5 + ada cache → follow-up

    return False

def _detect_compare(text: str) -> list[int]:
    """
    Kembalikan list index putusan yang mau dibandingkan.
    Contoh: 'bandingkan 1 dan 3' → [1, 3]
            'compare semua'      → semua index di cache
    """
    t = text.lower()
    if not any(k in t for k in _COMPARE_KEYWORDS):
        return []
    numbers = [int(n) for n in re.findall(r'\b([1-9]|10)\b', t)]
    return numbers  # kosong = belum tahu, caller handle "semua"

# ── DATABASE ──────────────────────────────────────────────────────────────────
import time

def cari_putusan(query: str, top_k: int = TOP_K, max_retries: int = 3) -> list[dict]:
    expanded = expand_query(query)
    vec = embedder.encode(expanded, normalize_embeddings=True).tolist()
    vec_str = "[" + ",".join(map(str, vec)) + "]"

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
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            register_vector(conn)
            cur = conn.cursor()
            cur.execute(sql, (vec_str, vec_str, top_k))
            rows = cur.fetchall()
            cur.close()
            conn.close()

            cols = [
                "nomor_pk", "nomor_pp", "tahun", "jenis_pajak",
                "objek_sengketa", "preview_sengketa",
                "amar", "pertimbangan", "argumen_pemohon", "argumen_terbanding",
                "alasan", "nilai_sengketa", "hakim_ketua", "dasar_hukum_fiskus",
                "skor"
            ]
            return [dict(zip(cols, r)) for r in rows]
            
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  [❌ DB Error] Failed after {max_retries} attempts: {e}")
                return []
            
            wait_time = 2 ** attempt  # exponential backoff: 1s, 2s, 4s
            print(f"  [⚠️ Retry {attempt + 1}/{max_retries}] Mencoba lagi dalam {wait_time}s...")
            time.sleep(wait_time)

# ── LLM CALL ──────────────────────────────────────────────────────────────────
def chat_with_kapha(user_query: str, context: str) -> str:
    prompt_final = f"""
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
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt_final)
    ]
    response = llm.invoke(messages)
    return response.content

# ── NOMOR PUTUSAN VALIDATOR ───────────────────────────────────────────────────
#
# Format yang dikenali (longgar agar tidak ada yang lolos):
#   PK  : "549/B/PK/Pjk/2018"
#   PP  : "Put.43667/PP/M.II/16/2013"  ← termasuk dengan spasi di tengah
#   PP2 : "PUT-123456/PP/..."
#
_PATTERN_PK = re.compile(
    r"\b\d{1,5}\s*/\s*(?:B\s*/\s*)?PK\s*/\s*(?:Pjk|PJK|B|PB)\s*/\s*\d{4}\b",
    re.IGNORECASE,
)
_PATTERN_PP = re.compile(
    # PUT diikuti titik/strip/spasi opsional, lalu angka, lalu /PP/...
    r"\bPUT\s*[.\-]?\s*\d{4,7}\s*/\s*PP\s*/\s*[\w.]+\s*/\s*\d+\s*/\s*\d{4}\b",
    re.IGNORECASE,
)

def ekstrak_nomor_dari_teks(teks: str) -> set[str]:
    """Ekstrak semua kandidat nomor putusan dari teks LLM."""
    hasil = set()
    for pat in [_PATTERN_PK, _PATTERN_PP]:
        for m in pat.finditer(teks):
            nomor = re.sub(r"\s+", "", m.group()).strip().upper()
            hasil.add(nomor)
    return hasil

def _normalize(nomor: str) -> str:
    """Normalisasi untuk fuzzy matching: hapus semua separator."""
    return re.sub(r"[\s\-./]", "", nomor).lower()

def validasi_nomor_ke_db(nomor_set: set[str]) -> dict:
    if not nomor_set:
        return {"valid": [], "halu": [], "total_disebut": 0, "is_clean": True}

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT nomor_putusan_pk, nomor_putusan_pp FROM putusan_pajak")
        rows = cur.fetchall()
        cur.close()
        conn.close()

        db_lookup: dict[str, str] = {}
        for pk, pp in rows:
            if pk:
                db_lookup[_normalize(pk)] = str(pk).strip()
            if pp:
                db_lookup[_normalize(pp)] = str(pp).strip()

    except Exception as e:
        print(f"  [Validator DB Error] {e}")
        return {
            "valid": [], "halu": [],
            "total_disebut": len(nomor_set),
            "is_clean": True,  # gagal validasi → jangan false alarm
            "error": str(e),
        }

    valid, halu = [], []
    for nomor in nomor_set:
        norm = _normalize(nomor)
        if norm in db_lookup:
            valid.append({"disebut": nomor, "db": db_lookup[norm]})
        else:
            halu.append(nomor)

    return {
        "valid": valid,
        "halu": halu,
        "total_disebut": len(nomor_set),
        "is_clean": len(halu) == 0,
    }

def tambah_peringatan_halu(answer: str, halu_list: list[str]) -> str:
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

# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or "default"
    sess = _get_session(session_id)
    cache: dict[int, dict] = sess["cache"]
    pesan = req.message.strip()

    # ── 1. Deteksi MODE ───────────────────────────────────────────────────────
    compare_indices = _detect_compare(pesan)
    is_followup     = _detect_followup(pesan, bool(cache))
    is_compare      = bool(compare_indices) and bool(cache)

    # ── 2A. MODE COMPARE ──────────────────────────────────────────────────────
    if is_compare:
        # Jika tidak ada angka spesifik → compare semua yang di cache
        if not compare_indices:
            compare_indices = list(cache.keys())
        target = {i: cache[i] for i in compare_indices if i in cache}
        if not target:
            return ChatResponse(
                answer="Putusan yang dimaksud tidak ada di hasil pencarian sebelumnya. Coba tanya topik dulu ya!",
                sources=[], session_id=session_id,
                validation={"valid": [], "halu": [], "total_disebut": 0, "is_clean": True},
            )
        konteks = format_konteks(list(target.values()))
        nomor_list = ", ".join(f"[{i}] {nomor_putusan(p)}" for i, p in target.items())
        prompt_compare = (
            f"Tolong bandingkan secara mendalam putusan berikut: {nomor_list}. "
            f"Jawab dalam Bahasa Indonesia, narasi mengalir, highlight perbedaan kunci."
        )
        answer = chat_with_kapha(pesan, konteks + "\n\n" + prompt_compare)
        relevan_list = list(target.values())

    # ── 2B. MODE FOLLOW-UP ────────────────────────────────────────────────────
    elif is_followup:
        # Cek apakah ada index spesifik yang disebut (misal "yang nomor 2")
        indices = [int(n) for n in re.findall(r'\b([1-9]|10)\b', pesan)]
        if indices:
            target = {i: cache[i] for i in indices if i in cache}
        else:
            target = cache  # pakai semua cache

        if not target:
            # Index tidak ada di cache → fallback ke retrieval baru
            is_followup = False
        else:
            konteks = format_konteks(list(target.values()))
            print(f"  [↩ FOLLOW-UP] Pakai cache session {session_id}, index: {list(target.keys())}")
            answer = chat_with_kapha(pesan, konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia.")
            relevan_list = list(target.values())

    # ── 2C. MODE NORMAL (retrieval baru) ──────────────────────────────────────
    if not is_compare and not is_followup:
        putusan_list = cari_putusan(pesan)
        putusan_list = filter_by_amar_intent(pesan, putusan_list)
        relevan_list = [p for p in putusan_list if p.get('skor', 0) >= 0.4]

        # Simpan ke session cache untuk follow-up berikutnya
        sess["cache"] = {i: p for i, p in enumerate(relevan_list, 1)}

        konteks = format_konteks(relevan_list)
        sess["konteks"] = konteks  # simpan untuk referensi debug

        if not konteks:
            return ChatResponse(
                answer="Mohon maaf, tidak ada putusan yang relevan dengan pertanyaan itu di database. Bisa coba diperjelas? 🙏",
                sources=[], session_id=session_id,
                validation={"valid": [], "halu": [], "total_disebut": 0, "is_clean": True},
            )

        print(f"  [🔍 RETRIEVAL] {len(relevan_list)} putusan relevan untuk session {session_id}")
        answer = chat_with_kapha(pesan, konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia.")

    # ── 3. Validasi nomor putusan ─────────────────────────────────────────────
    nomor_disebut = ekstrak_nomor_dari_teks(answer)
    validation    = validasi_nomor_ke_db(nomor_disebut)
    answer        = tambah_peringatan_halu(answer, validation.get("halu", []))

    if validation.get("halu"):
        print(f"  [⚠ HALU] Nomor tidak valid: {validation['halu']}")
    elif nomor_disebut:
        print(f"  [✓ OK] {len(validation.get('valid', []))} nomor valid terdeteksi")
    else:
        print(f"  [~] Tidak ada nomor putusan terdeteksi di jawaban (regex tidak match)")

    # ── 4. Build sources ──────────────────────────────────────────────────────
    sources = [
        {
            "nomor":       nomor_putusan(p),
            "jenis_pajak": safe(p.get("jenis_pajak")),
            "amar":        safe(p.get("amar")),
            "tahun":       safe(p.get("tahun")),
            "skor":        round(p.get("skor", 0), 3),
        }
        for p in relevan_list
    ]

    return ChatResponse(answer=answer, sources=sources, session_id=session_id, validation=validation)


@app.post("/validate")
def validate_teks(body: dict):
    """
    Endpoint manual untuk testing & evaluasi halusinasi.
    Body: { "teks": "..." }
    """
    teks = body.get("teks", "")
    if not teks:
        raise HTTPException(status_code=422, detail="Field 'teks' wajib diisi.")
    nomor_set  = ekstrak_nomor_dari_teks(teks)
    validation = validasi_nomor_ke_db(nomor_set)
    return {"input_length": len(teks), "nomor_ditemukan": list(nomor_set), **validation}


@app.get("/session/{session_id}")
def lihat_session(session_id: str):
    """Lihat isi cache session — berguna untuk debug follow-up."""
    sess  = _get_session(session_id)
    cache = sess.get("cache", {})
    return {
        "session_id": session_id,
        "jumlah_putusan_di_cache": len(cache),
        "putusan": [
            {
                "index": i,
                "nomor": nomor_putusan(p),
                "amar":  safe(p.get("amar")),
                "jenis_pajak": safe(p.get("jenis_pajak")),
            }
            for i, p in cache.items()
        ],
    }

@app.delete("/session/{session_id}")
def hapus_session(session_id: str):
    """Reset cache session — user bisa mulai fresh."""
    if session_id in _sessions:
        del _sessions[session_id]
    return {"status": "ok", "session_id": session_id}

# ─────────────────────────────────────────────────────────────────────────────
# Tambahkan endpoint ini ke dalam src/RAG/api.py (setelah endpoint /chat)
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional, List

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
    hakim_anggota: Optional[List[str]] = None
    # Ringkasan
    preview_sengketa: Optional[str] = None
    objek_sengketa: Optional[str] = None
    pos_koreksi: Optional[str] = None
    # Argumen
    argumen_pemohon: Optional[str] = None
    argumen_terbanding: Optional[str] = None
    dasar_hukum_fiskus: Optional[str] = None
    alat_bukti: Optional[str] = None
    # Pertimbangan
    pertimbangan_hakim: Optional[str] = None
    # Amar
    alasan_putusan: Optional[str] = None
    amar_putusan: Optional[str] = None


@app.get("/putusan/{nomor:path}", response_model=PutusanDetail)
async def get_putusan_detail(nomor: str):
    """
    Ambil detail lengkap satu putusan berdasarkan nomor putusan.
    Kolom yang diambil disesuaikan dengan skema tabel di database Anda.
    Ganti nama kolom sesuai struktur tabel aktual.
    """
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # ── Query utama ───────────────────────────────────────────────────────
        # Sesuaikan nama tabel dan kolom dengan database Anda!
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

        if not row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Putusan '{nomor}' tidak ditemukan")

        (
            nomor_db, amar, jenis_pajak, upaya_hukum, pengadilan,
            tahun_pajak, tanggal_putusan, negara, nilai_sengketa,
            pemohon, terbanding, hakim_ketua, hakim_anggota,
            preview_sengketa, objek_sengketa, pos_koreksi,
            argumen_pemohon, argumen_terbanding, dasar_hukum_fiskus,
            alat_bukti, pertimbangan_hakim, alasan_putusan, amar_putusan
        ) = row

        # hakim_anggota bisa berupa array PostgreSQL atau string CSV
        if isinstance(hakim_anggota, str):
            hakim_anggota = [h.strip() for h in hakim_anggota.split(",") if h.strip()]
        elif hakim_anggota is None:
            hakim_anggota = []

        return PutusanDetail(
            nomor=nomor_db,
            amar=amar or "",
            jenis_pajak=jenis_pajak or "",
            upaya_hukum=upaya_hukum or "",
            pengadilan=pengadilan or "",
            tahun_pajak=tahun_pajak or "",
            tanggal_putusan=tanggal_putusan or "",
            negara_lawan_transaksi=negara,
            nilai_sengketa=nilai_sengketa,
            pemohon=pemohon or "",
            terbanding=terbanding or "",
            hakim_ketua=hakim_ketua,
            hakim_anggota=hakim_anggota,
            preview_sengketa=preview_sengketa,
            objek_sengketa=objek_sengketa,
            pos_koreksi=pos_koreksi,
            argumen_pemohon=argumen_pemohon,
            argumen_terbanding=argumen_terbanding,
            dasar_hukum_fiskus=dasar_hukum_fiskus,
            alat_bukti=alat_bukti,
            pertimbangan_hakim=pertimbangan_hakim,
            alasan_putusan=alasan_putusan,
            amar_putusan=amar_putusan,
        )

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()