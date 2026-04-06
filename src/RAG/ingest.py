import json
import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer
from datetime import datetime

# 1. Inisialisasi Model Embedding Gratis (Lokal)
print("Sedang memuat model BGE-M3 (gratis)...")
model = SentenceTransformer('BAAI/bge-m3')

# 2. Koneksi ke Database (Sesuaikan dengan .env kamu)
conn = psycopg2.connect(
    host="localhost",
    database="alpha123",
    user="alpha123",
    password="alpha123",
    port="5433"
)
register_vector(conn)
cur = conn.cursor()

# 3. Load Data JSON (Gunakan file final yang sudah bersih)
with open('D:\\4. Magang\\Frontend\\frontend-alpha\\src\\RAG\\summary_pajak_final_fixed copy.json', 'r', encoding='utf-8') as f:
    data_list = json.load(f)

print(f"Memproses {len(data_list)} data...")

# Fungsi untuk konversi tanggal Indonesia ke format SQL (YYYY-MM-DD)
def parse_date(date_str):
    # Penanganan jika data None, string 'None', atau '-'
    if not date_str or str(date_str).strip() in ['None', '-', '']:
        return None
    
    # Mapping nama bulan Indonesia ke Inggris
    months = {
        'Januari': 'January', 'Februari': 'February', 'Maret': 'March',
        'April': 'April', 'Mei': 'May', 'Juni': 'June',
        'Juli': 'July', 'Agustus': 'August', 'September': 'September',
        'Oktober': 'October', 'November': 'November', 'Desember': 'December'
    }
    
    # Ganti nama bulan Indonesia ke Inggris
    formatted_date_str = str(date_str)
    for id_month, en_month in months.items():
        if id_month in formatted_date_str:
            formatted_date_str = formatted_date_str.replace(id_month, en_month)
            break
            
    try:
        # Parsing string ke objek datetime
        dt_obj = datetime.strptime(formatted_date_str, '%d %B %Y')
        # Kembalikan format YYYY-MM-DD untuk SQL
        return dt_obj.strftime('%Y-%m-%d')
    except ValueError:
        print(f"Peringatan: Gagal parsing tanggal: {date_str}")
        return None

# Fungsi pembantu untuk konversi dictionary/list ke string JSON agar bisa masuk TEXT field
def format_as_text(value):
    if isinstance(value, dict) or isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    # Jika sudah string tapi isinya 'None', ubah jadi None Python
    if str(value).strip().lower() == 'none':
        return None
    return value

for data in data_list:
    # 1. Ambil data dengan aman menggunakan .get()
    nomor_pk        = data.get('nomor_putusan_pk')
    nomor_pp        = data.get('nomor_putusan_pp')
    
    tahun           = data.get('tahun_putusan')
    tahun_int       = int(tahun) if tahun and str(tahun).isdigit() else None
    
    # KONVERSI TANGGAL
    raw_date        = data.get('tanggal_putusan')
    formatted_date  = parse_date(raw_date)
    
    upaya_hukum     = data.get('upaya_hukum')
    pengadilan      = data.get('pengadilan')
    pemohon         = data.get('pemohon')
    termohon        = data.get('termohon')
    jenis_pajak     = data.get('jenis_pajak')
    tahun_pajak     = data.get('tahun_pajak')
    
    objek           = data.get('objek_sengketa')
    preview         = data.get('preview_sengketa')
    
    # KONVERSI FIELD KOMPLEKS (dict/list) KE STRING agar tidak error dict
    pos_koreksi     = format_as_text(data.get('pos_koreksi'))
    nilai_koreksi   = format_as_text(data.get('nilai_koreksi'))
    dasar_hukum     = format_as_text(data.get('dasar_hukum_fiskus'))
    argumen_pemohon = format_as_text(data.get('argumen_pemohon'))
    argumen_terbanding = format_as_text(data.get('argumen_terbanding'))
    
    amar            = data.get('amar_putusan')
    alat_bukti      = format_as_text(data.get('alat_bukti'))
    pertimbangan    = data.get('pertimbangan_hakim')
    alasan          = data.get('alasan_keputusan')
    nilai_sengketa  = format_as_text(data.get('nilai_sengketa'))
    
    nama_file       = data.get('nama_file')
    hakim_ketua     = data.get('hakim_ketua')
    hakim_anggota   = format_as_text(data.get('hakim_anggota')) # list -> json string

    # 2. Gabungkan teks untuk AI
    nomor_tampilan = nomor_pk if nomor_pk else (nomor_pp if nomor_pp else "Unknown")
    teks_untuk_ai = f"Putusan: {nomor_tampilan}. Objek: {objek}. Pertimbangan: {pertimbangan}. Amar: {amar}"
    
    # 3. Proses jadi Vector
    print(f"Sedang memproses: {nomor_tampilan}")
    embedding = model.encode(teks_untuk_ai, normalize_embeddings=True).tolist()

    # 4. Simpan ke Postgres
    try:
        cur.execute("""
            INSERT INTO putusan_pajak (
                nomor_putusan_pk, nomor_putusan_pp, tahun_putusan, 
                tanggal_putusan, upaya_hukum, pengadilan,
                pemohon, termohon, jenis_pajak, tahun_pajak,
                objek_sengketa, preview_sengketa, pos_koreksi,
                nilai_koreksi, dasar_hukum_fiskus, argumen_pemohon,
                argumen_terbanding, amar_putusan, alat_bukti,
                pertimbangan_hakim, alasan_keputusan, nilai_sengketa,
                nama_file, hakim_ketua, hakim_anggota,
                embedding_konten
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            nomor_pk, nomor_pp, tahun_int,
            formatted_date, upaya_hukum, pengadilan,
            pemohon, termohon, jenis_pajak, tahun_pajak,
            objek, preview, pos_koreksi,
            nilai_koreksi, dasar_hukum, argumen_pemohon,
            argumen_terbanding, amar, alat_bukti,
            pertimbangan, alasan, nilai_sengketa,
            nama_file, hakim_ketua, hakim_anggota,
            embedding
        ))
    except psycopg2.Error as e:
        print(f"Error pada {nomor_tampilan}: {e}")
        conn.rollback() # Rollback jika ada error pada data tertentu
        continue

conn.commit()
print("Selesai! Semua data telah diproses.")
cur.close()
conn.close()