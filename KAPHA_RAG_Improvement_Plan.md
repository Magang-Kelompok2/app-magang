# KAPHA — Rencana Peningkatan Sistem RAG
**Konteks:** Sistem chatbot putusan pajak. User (konsultan/attorney) melakukan query singkat-padat seperti *"banding harga rata-rata CUP"* dan mengharapkan putusan yang paling relevan dikembalikan secara akurat.

---

## Masalah Utama

### Masalah 1 — Query pendek tapi domain-spesifik
**Situasi:** Bos melakukan query singkat seperti *"metode CUP harga rata-rata"* atau *"comparable uncontrolled price banding"*. Query ini tidak panjang seperti kalimat natural, tapi sangat dense secara domain hukum pajak.

**Dampak:** Model embedding umum (SentenceTransformer default) tidak dilatih pada korpus putusan pajak Indonesia. Akibatnya, cosine similarity bisa tinggi ke dokumen yang secara umum "mirip" tapi secara konteks hukum sangat berbeda — misalnya putusan PPh yang menyebut "harga" tapi bukan soal transfer pricing sama sekali.

---

### Masalah 2 — Full dense vector tidak cukup untuk exact term matching
**Situasi:** Sistem sekarang hanya menggunakan vector similarity (dense retrieval). Tidak ada komponen yang secara eksplisit memprioritaskan dokumen yang mengandung kata kunci persis seperti yang ditulis bos.

**Dampak:** Istilah teknis seperti "CUP", "TNMM", "arm's length", "tax treaty" bisa "hilang" dalam representasi vektor karena embedding merata-ratakan makna semantik. Dokumen yang mengandung kata tersebut secara eksplisit belum tentu muncul di top results.

---

### Masalah 3 — Kamus ekspansi sinonim belum cukup spesifik
**Situasi:** Ekspansi sinonim saat ini bersifat umum. Taksonomi metode transfer pricing yang digunakan di putusan pengadilan pajak sangat spesifik dan berbeda dari bahasa umum.

**Dampak:** Query "CUP" tidak otomatis di-expand ke "comparable uncontrolled price", "harga pasar bebas", atau variasi penyebutannya di putusan DJP/Pengadilan Pajak.

---

### Masalah 4 — Tidak ada pre-filtering berdasarkan metadata
**Situasi:** Setiap query langsung masuk ke full vector search tanpa mempersempit kandidat dokumen terlebih dahulu.

**Dampak:** Search space terlalu luas — putusan soal PPN, PPh Badan, bea masuk, semuanya menjadi kandidat meskipun bos mencari putusan TP spesifik. Ini menurunkan precision.

---

### Masalah 5 — Embedding model tidak pernah melihat teks putusan (jangka panjang)
**Situasi:** Model embedding yang dipakai adalah pretrained general-purpose. Belum ada fine-tuning pada data putusan pajak.

**Dampak:** Representasi vektor "transfer pricing" dan "arm's length principle" secara semantik mungkin terlalu dekat dengan teks non-pajak yang tidak relevan, dan terlalu jauh dari variasi penyebutan di putusan nyata.

---

## Solusi

### Solusi 1 — Hybrid Search: BM25 + Vector (Prioritas Tinggi)
**Mengatasi:** Masalah 1 & 2

**Cara kerja:** Tambahkan komponen sparse retrieval (BM25) di samping vector search yang sudah ada. Gabungkan hasilnya menggunakan **Reciprocal Rank Fusion (RRF)**.

- BM25 memprioritaskan dokumen yang mengandung kata kunci persis → tangkap exact term match
- Vector search tangkap semantik dan sinonim → tangkap variasi bahasa
- RRF menggabungkan ranking keduanya tanpa perlu tuning weight manual

**Implementasi di PostgreSQL:**
- Gunakan `tsvector` + `GIN index` untuk BM25/full-text search
- Gunakan `pgvector` (sudah ada) untuk dense search
- Gabungkan dengan RRF di layer FastAPI

**Estimasi effort:** 2–3 hari implementasi

---

### Solusi 2 — Perluas Kamus Ekspansi Query (Prioritas Tinggi)
**Mengatasi:** Masalah 3

**Cara kerja:** Buat kamus taksonomi TP yang manual dan kurated, mencakup:

| Term Pendek | Ekspansi |
|---|---|
| CUP | comparable uncontrolled price, harga pasar bebas, metode harga pasar |
| TNMM | transactional net margin method, metode laba bersih |
| CPM | cost plus method, metode cost plus, harga pokok plus |
| RPM | resale price method, harga jual kembali |
| Arm's length | prinsip kewajaran, hubungan istimewa, harga wajar |
| Tax treaty | perjanjian penghindaran pajak berganda, P3B, tax treaty |
| Harga rata-rata | rata-rata aritmatik, average price, weighted average |

Kamus ini tidak bisa digantikan LLM generik karena sangat domain-spesifik dan menggunakan singkatan internal DJP/Pengadilan Pajak.

**Estimasi effort:** 1–2 hari (+ iterasi berdasarkan feedback bos)

---

### Solusi 3 — Metadata Pre-filtering (Prioritas Menengah)
**Mengatasi:** Masalah 4

**Cara kerja:** Saat indexing putusan, ekstrak dan simpan metadata terstruktur:
- Jenis sengketa: banding, gugatan, peninjauan kembali (PK)
- Jenis pajak: PPh, PPN, Bea Masuk, Transfer Pricing
- Metode TP yang disebut (kalau ada)
- Tahun putusan
- Amar putusan: dikabulkan / ditolak / sebagian

Saat query masuk, deteksi intent dari query → terapkan filter PostgreSQL **sebelum** vector search dilakukan.

Contoh: query "CUP banding" → filter `jenis_sengketa = 'banding' AND topik = 'transfer_pricing'` → baru vector search pada subset itu.

**Estimasi effort:** 3–5 hari (termasuk re-indexing dengan metadata)

---

### Solusi 4 — HyDE: Hypothetical Document Embeddings (Prioritas Menengah)
**Mengatasi:** Masalah 1

**Cara kerja:**
1. Query bos masuk → kirim ke LLM dengan instruksi: *"Tulis paragraf seperti yang ada di putusan pajak yang relevan dengan pertanyaan ini"*
2. Embed paragraf hipotetis tersebut → hasilnya vektor yang distribusinya mirip dengan dokumen putusan nyata
3. Gunakan vektor itu untuk search, bukan vektor dari query asli

**Kenapa efektif:** Query "CUP harga rata-rata" (5 kata) punya vektor yang sangat sparse. Dokumen hipotetis yang dihasilkan LLM ("Majelis berpendapat bahwa penerapan metode Comparable Uncontrolled Price dengan menggunakan harga rata-rata...") punya vektor yang jauh lebih kaya dan dekat ke distribusi putusan asli.

**Catatan:** Ini perlu di-AB test dulu — ada overhead latency tambahan karena ada satu LLM call ekstra sebelum search.

**Estimasi effort:** 1–2 hari implementasi + 1 minggu evaluasi

---

### Solusi 5 — Fine-tune Embedding Model (Prioritas Rendah, Jangka Panjang)
**Mengatasi:** Masalah 5

**Cara kerja:** Kumpulkan pasangan data (query contoh → putusan relevan) dari history penggunaan atau dari kurasi manual bos. Gunakan untuk fine-tune SentenceTransformer dengan contrastive loss (teknik: Multiple Negatives Ranking Loss).

Setelah fine-tune, model akan punya representasi vektor yang khusus untuk domain putusan pajak Indonesia.

**Prasyarat:** Butuh minimal ~500–1000 pasangan query-dokumen relevan yang sudah dilabel.

**Estimasi effort:** 2–4 minggu (termasuk pengumpulan data dan training)

---

## Roadmap Implementasi

| Fase | Item | Prioritas | Estimasi |
|---|---|---|---|
| **Fase 1** | Perluas kamus ekspansi query TP | Tinggi | 1–2 hari |
| **Fase 1** | Implementasi BM25 + RRF hybrid search | Tinggi | 2–3 hari |
| **Fase 2** | Ekstraksi metadata + pre-filtering | Menengah | 3–5 hari |
| **Fase 2** | Eksperimen HyDE | Menengah | 1–2 hari |
| **Fase 3** | Fine-tune embedding model | Rendah | 2–4 minggu |

---

## Cara Evaluasi Efektivitas

Setiap perubahan perlu diukur, bukan hanya dirasa lebih baik. Metode:

- **Precision@5:** Dari 5 putusan yang dikembalikan, berapa yang benar-benar relevan? Minta bos rating 1–5 untuk setiap hasil.
- **Recall:** Apakah putusan "landmark" yang bos sudah tahu ada di database selalu muncul?
- **Mean Reciprocal Rank (MRR):** Seberapa tinggi ranking putusan paling relevan?
- Siapkan set 20–30 query test dari bos → jalankan sebelum dan sesudah perubahan → bandingkan skornya.

---

*Dokumen ini adalah rencana bertahap. Fase 1 bisa langsung dikerjakan dengan effort rendah tapi dampak signifikan. Fase 2–3 mengikuti setelah Fase 1 terbukti meningkatkan hasil.*
