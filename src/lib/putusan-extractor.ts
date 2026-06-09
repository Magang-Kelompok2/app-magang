// src/lib/putusan-extractor.ts

import { GoogleGenerativeAI } from "@google/generative-ai";

export type ExtractedPutusan = {
  nomor_putusan_pk: string | null;
  nomor_putusan_pp: string | null;
  tahun_putusan: string | null;
  tanggal_putusan: string | null;
  upaya_hukum: string | null;
  pengadilan: string | null;
  pemohon: string | null;
  termohon: string | null;
  jenis_pajak: string | null;
  jenis_sengketa: string | null;
  tahun_pajak: string | null;
  objek_sengketa: string | null;
  preview_sengketa: string | null;
  pos_koreksi: string | null;
  nilai_koreksi: string | null;
  dasar_hukum_fiskus: string | null;
  argumen_pemohon: string | null;
  argumen_terbanding: string | null;
  amar_putusan: string | null;
  alat_bukti: string | null;
  pertimbangan_hakim: string | null;
  alasan_keputusan: string | null;
  nilai_sengketa: string | null;
  hakim_ketua: string | null;
  hakim_anggota: string | null;
  nama_file?: string;
};

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY belum diatur di environment");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(text: string): ExtractedPutusan {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as ExtractedPutusan;
}

function normalizeAmarPutusan(value: string | null): string {
  if (!value) return "Lain-lain";

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("seluruh")) {
    return "Mengabulkan Seluruhnya";
  }

  if (normalized.includes("sebagian")) {
    return "Mengabulkan Sebagian";
  }

  if (normalized.includes("batal")) {
    return "Membatalkan";
  }

  if (normalized.includes("tidak") && normalized.includes("diterima")) {
    return "Tidak Dapat Diterima";
  }

  if (normalized.includes("tolak") || normalized.includes("menolak")) {
    return "Menolak";
  }

  return "Lain-lain";
}

function buildPrompt(textContent: string): string {
  return `
Tugasmu: Ekstrak informasi dari teks putusan berikut dan kembalikan HANYA JSON valid.
Jangan tambahkan markdown, penjelasan, atau teks apa pun di luar JSON.

ATURAN:
- Jika informasi tidak tersedia, gunakan null.
- Nilai uang ditulis sebagai string lengkap, contoh: "Rp 22.426.000,00".
- "argumen_pemohon" dan "argumen_terbanding": ringkas 2-4 kalimat.
- "pertimbangan_hakim": ringkas 3-5 kalimat.
- "alasan_keputusan": 1-2 kalimat inti alasan hakim.
- "jenis_sengketa":
  Klasifikasikan berdasarkan isi perkara.
  Gunakan salah satu:
  "Pajak", "Bea Cukai", "Perdata", "Tata Usaha Negara", "Pidana", "Kepailitan", "Ketenagakerjaan", "Lainnya".
  Jika terkait PPN, PPh, SKPKB, SKK, keberatan pajak, banding pajak, isi "Pajak".
  Jika terkait bea masuk, nilai pabean, PIB, tarif, klasifikasi barang, isi "Bea Cukai".
  Jika terkait wanprestasi, kontrak, hutang piutang, PMH, isi "Perdata".
- "amar_putusan":
  Cari bagian setelah kata kunci:
  "MENGADILI", "M E N G A D I L I", "MEMUTUSKAN", atau "Memutuskan".
  Biasanya amar berada tepat di bawah kata kunci tersebut.
  WAJIB isi hanya salah satu dari opsi berikut, dengan penulisan persis:
  "Mengabulkan Seluruhnya",
  "Membatalkan",
  "Tidak Dapat Diterima",
  "Mengabulkan Sebagian",
  "Menolak",
  "Lain-lain".
  Jangan gunakan variasi lain seperti "mengabulkan", "lainnya", "menolak permohonan", atau huruf kecil.
- "upaya_hukum":
  "Banding" jika objeknya Surat Keputusan Keberatan/SKK.
  "Gugatan" jika objeknya prosedur penagihan, surat paksa, atau administratif.
  "Peninjauan Kembali" jika objeknya Putusan Pengadilan Pajak yang dibawa ke MA.
- "pengadilan":
  Banding/Gugatan -> "Pengadilan Pajak".
  Peninjauan Kembali -> "Mahkamah Agung".
  Selain itu sesuaikan dengan teks.
- "hakim_ketua": cari di bagian Susunan Majelis atau tanda tangan.
- "hakim_anggota": pisahkan dengan koma jika lebih dari satu.

TEKS PUTUSAN:
${textContent.slice(0, 120000)}

FORMAT JSON:
{
  "nomor_putusan_pk": null,
  "nomor_putusan_pp": null,
  "tahun_putusan": null,
  "tanggal_putusan": null,
  "upaya_hukum": null,
  "pengadilan": null,
  "pemohon": null,
  "termohon": null,
  "jenis_pajak": null,
  "jenis_sengketa": null,
  "tahun_pajak": null,
  "objek_sengketa": null,
  "preview_sengketa": null,
  "pos_koreksi": null,
  "nilai_koreksi": null,
  "dasar_hukum_fiskus": null,
  "argumen_pemohon": null,
  "argumen_terbanding": null,
  "amar_putusan": null,
  "alat_bukti": null,
  "pertimbangan_hakim": null,
  "alasan_keputusan": null,
  "nilai_sengketa": null,
  "hakim_ketua": null,
  "hakim_anggota": null
}
`;
}

function isRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);

  return (
    message.includes("503") ||
    message.includes("Service Unavailable") ||
    message.includes("high demand") ||
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("DEADLINE_EXCEEDED") ||
    message.includes("500")
  );
}

export async function extractPutusanInfo(
  textContent: string,
  fileName: string,
): Promise<ExtractedPutusan> {
  const prompt = buildPrompt(textContent);
  let lastError: unknown = null;

  for (const modelName of MODELS_TO_TRY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(
          `[Gemini] Extracting ${fileName} | model=${modelName} | attempt=${attempt}`,
        );

        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const responseText = result.response.text();
        const extracted = safeJsonParse(responseText);

        extracted.amar_putusan = normalizeAmarPutusan(
          extracted.amar_putusan,
        );
        extracted.nama_file = fileName;

        return extracted;
      } catch (err) {
        lastError = err;

        console.error(
          `[Gemini] Gagal model=${modelName} attempt=${attempt}:`,
          err,
        );

        if (!isRetryableGeminiError(err)) {
          throw err;
        }

        await sleep(1500 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gagal mengekstrak putusan dengan semua model Gemini");
}