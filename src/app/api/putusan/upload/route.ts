// src/app/api/putusan/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "../../../../lib/db";
import { errorResponse, ValidationError } from "../../../../lib/errors";
import { extractPdfText } from "../../../../lib/pdf-extract";
import { extractPutusanInfo } from "../../../../lib/putusan-extractor";
import {
  buildEmbeddingText,
  generateEmbedding,
  toPgVector,
} from "../../../../lib/embedding";
import { uploadPutusanPdf, sanitizeObjectName } from "../../../../lib/minio";

export const runtime = "nodejs";

function normalizeDate(value: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const months: Record<string, string> = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };

  const match = raw.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);

  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = months[match[2]];
  const year = match[3];

  if (!month) return null;

  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ValidationError("File PDF wajib diupload");
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      throw new ValidationError("File harus berupa PDF");
    }

    const safeFileName = sanitizeObjectName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    const duplicate = await query(
      `SELECT id FROM putusan_pajak WHERE nama_file = $1 LIMIT 1`,
      [safeFileName],
    );

    if (duplicate.rows.length > 0) {
      throw new ValidationError(`File '${safeFileName}' sudah ada di database`);
    }

    const text = await extractPdfText(buffer);
    const extracted = await extractPutusanInfo(text, safeFileName);

    extracted.nama_file = safeFileName;

    const tanggalPutusan = normalizeDate(extracted.tanggal_putusan);

    await uploadPutusanPdf(safeFileName, buffer);

    const inserted = await withTransaction(async (client) => {
      const insertResult = await client.query(
        `
    INSERT INTO putusan_pajak (
      nomor_putusan_pk,
      nomor_putusan_pp,
      tahun_putusan,
      tanggal_putusan,
      upaya_hukum,
      pengadilan,
      pemohon,
      termohon,
      jenis_pajak,
      tahun_pajak,
      objek_sengketa,
      preview_sengketa,
      pos_koreksi,
      nilai_koreksi,
      dasar_hukum_fiskus,
      argumen_pemohon,
      argumen_terbanding,
      amar_putusan,
      alat_bukti,
      pertimbangan_hakim,
      alasan_keputusan,
      nilai_sengketa,
      nama_file,
      hakim_ketua,
      hakim_anggota,
      jenis_sengketa
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26
    )
    RETURNING *
    `,
        [
          extracted.nomor_putusan_pk,
          extracted.nomor_putusan_pp,
          extracted.tahun_putusan,
          tanggalPutusan,
          extracted.upaya_hukum,
          extracted.pengadilan,
          extracted.pemohon,
          extracted.termohon,
          extracted.jenis_pajak,
          extracted.tahun_pajak,
          extracted.objek_sengketa,
          extracted.preview_sengketa,
          extracted.pos_koreksi,
          extracted.nilai_koreksi,
          extracted.dasar_hukum_fiskus,
          extracted.argumen_pemohon,
          extracted.argumen_terbanding,
          extracted.amar_putusan,
          extracted.alat_bukti,
          extracted.pertimbangan_hakim,
          extracted.alasan_keputusan,
          extracted.nilai_sengketa,
          safeFileName,
          extracted.hakim_ketua,
          extracted.hakim_anggota,
          extracted.jenis_sengketa,
        ],
      );

      return insertResult.rows[0];
    });

    try {
      const embeddingText = buildEmbeddingText(extracted);
      const embedding = await generateEmbedding(embeddingText);
      const vector = toPgVector(embedding);

      await query(
        `
        UPDATE putusan_pajak
        SET embedding_konten = $1::vector
        WHERE id = $2
        `,
        [vector, inserted.id],
      );
    } catch (embeddingErr) {
      console.error(
        "[UPLOAD PUTUSAN] Gagal generate/update embedding:",
        embeddingErr,
      );
    }

    return NextResponse.json(
      {
        message: "Putusan berhasil ditambahkan",
        item: inserted,
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
