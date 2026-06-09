// src/lib/embedding.ts
import type { ExtractedPutusan } from "./putusan-extractor";

export function buildEmbeddingText(data: ExtractedPutusan): string {
  return [
    data.nomor_putusan_pp,
    data.nomor_putusan_pk,
    data.jenis_pajak,
    data.jenis_sengketa,
    data.upaya_hukum,
    data.pengadilan,
    data.pemohon,
    data.termohon,
    data.objek_sengketa,
    data.preview_sengketa,
    data.pos_koreksi,
    data.dasar_hukum_fiskus,
    data.argumen_pemohon,
    data.argumen_terbanding,
    data.amar_putusan,
    data.alat_bukti,
    data.pertimbangan_hakim,
    data.alasan_keputusan,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env.FASTAPI_URL;

  if (!baseUrl) {
    throw new Error("FASTAPI_URL belum diatur di .env.local");
  }

  const res = await fetch(`${baseUrl}/embedding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(
      result.detail || result.message || "Gagal generate embedding BGE",
    );
  }

  if (!Array.isArray(result.embedding)) {
    throw new Error("Response embedding tidak valid");
  }

  if (result.embedding.length !== 1024) {
    throw new Error(
      `Dimensi embedding harus 1024, tetapi diterima ${result.embedding.length}`,
    );
  }

  return result.embedding;
}

export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}
