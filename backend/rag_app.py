import re
import psycopg2
from sentence_transformers import SentenceTransformer
# Ganti google-generativeai dengan langchain_ollama atau library penyedia Llama 3 lainnya
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
import os
from dotenv import load_dotenv

# ── KONFIGURASI ──────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASS"),
    "port": os.getenv("DB_PORT")
}
TOP_K = 5
# ─────────────────────────────────────────────────────────────────────────────

# Ambil konfigurasi dari .env (pastikan load_dotenv() sudah dipanggil di atas)
MODEL_NAME = os.getenv("MODEL_NAME", "llama3")
BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL_PATH = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

print(f"⏳ Loading embedding model ({EMBED_MODEL_PATH})...")
embedder = SentenceTransformer(EMBED_MODEL_PATH)

# Inisialisasi Llama 3 via Ollama
print(f"⏳ Connecting to {MODEL_NAME} at {BASE_URL}...")
llm = ChatOllama(
    model=MODEL_NAME,
    base_url=BASE_URL,
    temperature=0.3, # Diturunkan ke 0.3 agar jawaban lebih konsisten & tidak bertele-tele
)

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

def chat_with_kapha(user_query, context=""):
    # Kita bungkus agar Llama 3 patuh pada Bahasa Indonesia
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

# ── SESSION CACHE ─────────────────────────────────────────────────────────────
# Menyimpan hasil retrieval terakhir agar follow-up bisa merujuk ke putusan yang sama
session_cache: dict[int, dict] = {}   # {1: data_putusan, 2: ..., dst}


# ── HELPER ───────────────────────────────────────────────────────────────────
def safe(value, fallback="Tidak tersedia") -> str:
    """Kembalikan fallback jika value None/kosong — cegah halusinasi."""
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback


def expand_query(query: str) -> str:
    """
    Perluas query pendek/ambigu dengan sinonim konteks pajak.
    Tujuan: tingkatkan recall untuk query seperti 'data pembanding rugi'.
    """
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
            break   # satu ekspansi cukup, hindari noise berlebihan
    return expanded


def detect_compare_mode(text: str) -> list[int]:
    """
    Deteksi apakah user minta mode compare, dan putusan mana yang dibandingkan.
    Contoh: 'bandingkan putusan 1 dan 3' → [1, 3]
            'compare semua' → semua nomor di cache
    """
    text_lower = text.lower()
    keywords = ["bandingkan", "compare", "banding", "perbandingan", "bedakan", "vs", "versus"]
    if not any(k in text_lower for k in keywords):
        return []

    # Cari nomor putusan yang disebut
    numbers = [int(n) for n in re.findall(r'\b([1-9]|10)\b', text)]
    if not numbers and "semua" in text_lower:
        numbers = list(session_cache.keys())
    return numbers


# ── DATABASE ─────────────────────────────────────────────────────────────────
def cari_putusan(query: str, top_k: int = TOP_K) -> list[dict]:
    """Vector similarity search dengan query expansion."""
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
        cur  = conn.cursor()
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


# ── FORMAT CONTEXT ────────────────────────────────────────────────────────────
def nomor_putusan(p: dict) -> str:
    return safe(p.get("nomor_pk") or p.get("nomor_pp"), "Nomor tidak tersedia")


def format_satu(p: dict, index: int) -> str:
    """Format tanpa label index agar LLM fokus pada Nomor Putusan asli."""
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


# ── CORE CHAT (DENGAN FILTER RELEVANSI) ───────────────────────────────────────
def tanya(pesan: str) -> str:
    global session_cache

    # 1. Ambil data dari database (Tetap K=5)
    putusan_list = cari_putusan(pesan)

    # 2. FILTERING: Hanya simpan yang skornya di atas 0.4 (40%)
    # Ini agar putusan yang "ngaco" tidak ikut dibaca Llama 3
    relevan_list = [p for p in putusan_list if p.get('skor', 0) >= 0.4]

    # Update session cache (hanya yang relevan agar user tidak bingung)
    session_cache = {}
    for i, p in enumerate(relevan_list, 1):
        session_cache[i] = p

    # 3. Cek mode COMPARE
    compare_indices = detect_compare_mode(pesan)
    if compare_indices and session_cache:
        target = {i: session_cache[i] for i in compare_indices if i in session_cache}
        if not target:
            return "Waduh, putusan itu nggak ada di hasil pencarian yang relevan nih. Coba tanya yang lain? 😊"

        konteks = format_konteks(list(target.values()))
        nomor_list = ", ".join(f"[{i}] {nomor_putusan(p)}" for i, p in target.items())
        
        prompt_compare = f"Tolong bandingkan secara mendalam putusan berikut: {nomor_list}. Jawab dalam Bahasa Indonesia ya!"
        return chat_with_kapha(pesan, konteks + "\n\n" + prompt_compare)

    # 4. Mode normal
    konteks = format_konteks(relevan_list)

    if konteks:
        # Tambahkan instruksi paksa Bahasa Indonesia agar tidak "drifting" ke Inggris
        return chat_with_kapha(pesan, konteks + "\n\nWAJIB: Jawab seluruhnya dalam Bahasa Indonesia.")
    else:
        # Jika setelah difilter ternyata kosong semua
        return "Mohon maaf, sepertinya nggak ada putusan di database yang benar-benar relevan dengan pertanyaan itu. Bisa coba diperjelas query-nya? 🙏"

# ── DISPLAY HELPER ────────────────────────────────────────────────────────────
def tampilkan_cache():
    """Tampilkan ringkasan putusan yang ada di cache saat ini."""
    if not session_cache:
        print("  (Belum ada hasil pencarian di sesi ini)\n")
        return
    print("\n  📋 Putusan di cache sesi ini:")
    for i, p in session_cache.items():
        print(f"    [{i}] {nomor_putusan(p)} | {safe(p.get('jenis_pajak'))} | {safe(p.get('amar'))}")
    print()


# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
def main():
    print("\n" + "="*55)
    print("  KAPHA v3 — Asisten Putusan Pajak Indonesia 🇮🇩")
    print("="*55)
    print("Perintah khusus:")
    print("  /cache    → lihat putusan hasil pencarian terakhir")
    print("  /clear    → hapus cache & mulai sesi baru")
    print("  exit      → keluar\n")
    print("Tips compare: 'bandingkan putusan 1 dan 3' atau 'compare semua'\n")

    while True:
        try:
            user = input("Kamu: ").strip()
            if not user:
                continue

            if user.lower() in ("exit", "keluar", "quit"):
                print("KAPHA: Oke, sampai jumpa! 👋")
                break

            if user.lower() == "/cache":
                tampilkan_cache()
                continue

            if user.lower() == "/clear":
                session_cache.clear()
                print("  ✅ Cache dikosongkan. Sesi baru dimulai.\n")
                continue

            jawaban = tanya(user)
            print(f"\nKAPHA: {jawaban}\n")

        except KeyboardInterrupt:
            print("\nKAPHA: Oke, sampai jumpa! 👋")
            break
        except Exception as e:
            print(f"\n  [Error] {e}\n")


if __name__ == "__main__":
    main()