import re
import os
import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

# ── KONFIGURASI ──────────────────────────────────────────────────────────────
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
llm = ChatOllama(model=MODEL_NAME, base_url=BASE_URL, temperature=0.3)

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

# ── Session Cache (in-memory, per session) ────────────────────────────────────
# Untuk production dengan banyak user, ganti dengan Redis
sessions: dict[str, dict[int, dict]] = {}

# ── PROMPTS ───────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
Kamu adalah KAPHA, Senior Konsultan Pajak Internasional yang santai tapi tajam.

PRINSIP JAWABAN (WAJIB):
1. NO TEMPLATE: Dilarang keras menggunakan nomor urut (Putusan 1, 2, dst) atau nomor palsu (123456). Gunakan NOMOR PUTUSAN ASLI dari data.
2. AMAR PUTUSAN: WAJIB menyatakan apakah Hakim MENERIMA (Membatalkan koreksi) atau MENOLAK (Mempertahankan koreksi) argumen Fiskus/WP.
3. ANTI-REPETISI: Jika ada beberapa putusan dengan pola sengketa yang mirip, GABUNGKAN narasinya menjadi satu kesimpulan yang padat.
4. ISU RUGI: Cari fakta 'rugi'/'loss'. Jika tidak ada, sampaikan secara natural bahwa kondisi rugi tidak disebutkan eksplisit.
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
    }
    expanded = query
    for pattern, replacement in expansions.items():
        if re.search(pattern, query, re.IGNORECASE):
            expanded = f"{query} {replacement}"
            break
    return expanded

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
    return "\n\n".join(format_satu(p, i) for i, p in enumerate(putusan_list, 1))

# ── DATABASE ──────────────────────────────────────────────────────────────────
def cari_putusan(query: str, top_k: int = TOP_K) -> list[dict]:
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
        print(f"  [DB Error] {e}")
        return []

# ── LLM CALL ──────────────────────────────────────────────────────────────────
def chat_with_kapha(user_query: str, context: str) -> str:
    prompt_final = f"""
BERIKUT ADALAH DATA PUTUSAN SEBAGAI REFERENSI:
{context}

PERTANYAAN: {user_query}

PERATURAN JAWABAN:
1. Gunakan Bahasa Indonesia yang santai tapi tajam (Gaya Senior Konsultan).
2. Jika data menggunakan Bahasa Inggris, terjemahkan poin pentingnya ke Bahasa Indonesia.
3. Jawaban dalam bentuk NARASI/PARAGRAF mengalir menggunakan Nomor Putusan asli (PK/PP).
4. Jelaskan SEBAB (kenapa dikoreksi) dan AKIBAT (hasil putusan/amar hakim).
5. Berikan KESIMPULAN di akhir jika terdapat pola yang sama antar putusan.
6. Jawab FULL dalam Bahasa Indonesia.
"""
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt_final)
    ]
    response = llm.invoke(messages)
    return response.content

# ── ROUTES ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or "default"

    # 1. Retrieve
    putusan_list = cari_putusan(req.message)
    relevan_list = [p for p in putusan_list if p.get('skor', 0) >= 0.4]

    # 2. Update cache session
    if session_id not in sessions:
        sessions[session_id] = {}
    sessions[session_id] = {i: p for i, p in enumerate(relevan_list, 1)}

    # 3. Build context & generate
    konteks = format_konteks(relevan_list)

    if not konteks:
        return ChatResponse(
            answer="Mohon maaf, tidak ada putusan yang relevan dengan pertanyaan itu di database. Bisa coba diperjelas? 🙏",
            sources=[],
            session_id=session_id,
        )

    answer = chat_with_kapha(
        req.message,
        konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia."
    )

    # 4. Build sources untuk ditampilkan di frontend
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

    return ChatResponse(answer=answer, sources=sources, session_id=session_id)

@app.get("/session/{session_id}")
def get_session(session_id: str):
    cache = sessions.get(session_id, {})
    return {
        "session_id": session_id,
        "putusan": [
            {
                "index": i,
                "nomor": nomor_putusan(p),
                "amar":  safe(p.get("amar")),
                "jenis_pajak": safe(p.get("jenis_pajak")),
            }
            for i, p in cache.items()
        ]
    }