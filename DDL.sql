-- 1. Aktifkan ekstensi vector
CREATE EXTENSION IF NOT EXISTS vector;

drop table putusan_pajak

-- 2. Buat tabel putusan_pajak
CREATE TABLE putusan_pajak (
    id SERIAL PRIMARY KEY,
    nomor_putusan_pk VARCHAR(100),
    nomor_putusan_pp VARCHAR(100),
    tahun_putusan INTEGER,
    tanggal_putusan DATE,
    upaya_hukum VARCHAR(100),
    pengadilan VARCHAR(100),
    pemohon TEXT,
    termohon TEXT,
    jenis_pajak VARCHAR(100),
    tahun_pajak VARCHAR(10),
    objek_sengketa TEXT,
    preview_sengketa TEXT,
    pos_koreksi TEXT,
    nilai_koreksi TEXT, -- Disimpan teks karena ada mata uang (USD/IDR)
    dasar_hukum_fiskus TEXT,
    argumen_pemohon TEXT,
    argumen_terbanding TEXT,
    amar_putusan VARCHAR(50),
    alat_bukti TEXT,
    pertimbangan_hakim TEXT,
    alasan_keputusan TEXT,
    nilai_sengketa TEXT,
    nama_file VARCHAR(255),
    hakim_ketua VARCHAR(255),
    hakim_anggota TEXT,
    
    -- KOLOM VECTOR (Gunakan 1024 jika pakai model BGE-M3)
    -- Jika nanti pakai model lain, angka 1024 ini tinggal disesuaikan
    embedding_konten vector(1024) 
);
ALTER TABLE putusan_pajak ALTER COLUMN tahun_pajak TYPE VARCHAR(50);
ALTER TABLE putusan_pajak ALTER COLUMN amar_putusan TYPE VARCHAR(255);

-- 3. Buat Index HNSW (biar pencarian ribuan data tetap secepat kilat)
CREATE INDEX ON putusan_pajak USING hnsw (embedding_konten vector_cosine_ops);
