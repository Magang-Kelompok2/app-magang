// src/app/api/putusan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { errorResponse, ValidationError } from "../../..//lib/errors";

type StatusCategory =
  | "menolak"
  | "mengabulkan seluruhnya"
  | "mengabulkan sebagian"
  | "tidak dapat diterima"
  | "membatalkan"
  | "lainnya";

function isValidParam(val: string | null): val is string {
  return Boolean(
    val &&
      val.trim() !== "" &&
      val !== "[]" &&
      val !== "all" &&
      val !== "undefined" &&
      val !== "null"
  );
}

function normalizeStatusValue(value: string): StatusCategory {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("seluruh")) return "mengabulkan seluruhnya";
  if (normalized.includes("sebagian")) return "mengabulkan sebagian";
  if (normalized.includes("menolak") || normalized.includes("tolak")) return "menolak";
  if (normalized.includes("tidak") && normalized.includes("diterima")) return "tidak dapat diterima";
  if (normalized.includes("batal")) return "membatalkan";
  return "lainnya";
}

function amarCategorySql(column = "amar_putusan"): string {
  return `
    CASE
      WHEN LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%seluruh%' THEN 'mengabulkan seluruhnya'
      WHEN LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%sebagian%' THEN 'mengabulkan sebagian'
      WHEN LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%menolak%' OR LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%tolak%' THEN 'menolak'
      WHEN LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%tidak%diterima%' THEN 'tidak dapat diterima'
      WHEN LOWER(TRIM(COALESCE(${column}, ''))) LIKE '%batal%' THEN 'membatalkan'
      ELSE 'lainnya'
    END
  `;
}

function normalizePengadilanValue(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "ma" || normalized.includes("mahkamah")) return "Mahkamah Agung";
  if (normalized === "pp" || normalized.includes("pengadilan pajak")) return "Pengadilan Pajak";

  return value.trim();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const jenisPajak = searchParams.get("jenisPajak");
    const upayaHukum = searchParams.get("upayaHukum");
    const pengadilan = searchParams.get("pengadilan");
    const tahunPutusan = searchParams.get("tahunPutusan");
    const tahunPajak = searchParams.get("tahunPajak");
    const search = searchParams.get("search");

    // Validate search length to prevent DoS
    if (search && search.length > 200) {
      throw new ValidationError("Search query too long (max 200 characters)");
    }

    const conditions: string[] = ["1=1"];
    const values: unknown[] = [];

    function addParam(value: unknown): string {
      values.push(value);
      return `$${values.length}`;
    }

    if (isValidParam(status)) {
      const arr = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(normalizeStatusValue);
      if (arr.length > 0) {
        conditions.push(`${amarCategorySql()} = ANY(${addParam(arr)}::text[])`);
      }
    }

    if (isValidParam(jenisPajak)) {
      const arr = jenisPajak.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
      if (arr.length > 0) {
        const paramRef = addParam(arr);
        conditions.push(`
          EXISTS (
            SELECT 1
            FROM unnest(${paramRef}::text[]) AS selected_jenis
            WHERE LOWER(COALESCE(jenis_pajak, '')) LIKE '%' || selected_jenis || '%'
          )
        `);
      }
    }

    if (isValidParam(upayaHukum)) {
      const arr = upayaHukum.split(",").map((u) => u.trim().toLowerCase()).filter(Boolean);
      if (arr.length > 0) {
        const paramRef = addParam(arr);
        conditions.push(`
          EXISTS (
            SELECT 1
            FROM unnest(${paramRef}::text[]) AS selected_upaya
            WHERE LOWER(COALESCE(upaya_hukum, '')) LIKE '%' || selected_upaya || '%'
          )
        `);
      }
    }

    if (isValidParam(pengadilan) && pengadilan !== "Semua") {
      const pengadilanValue = normalizePengadilanValue(pengadilan);
      conditions.push(`pengadilan ILIKE ${addParam(`%${pengadilanValue}%`)}`);
    }

    if (isValidParam(tahunPutusan) && tahunPutusan.includes(",")) {
      const [startRaw, endRaw] = tahunPutusan.split(",");
      const start = parseInt(startRaw, 10);
      const end = parseInt(endRaw, 10);
      const YEAR_MIN = 1990;
      const YEAR_MAX = new Date().getFullYear() + 1;

      if (isNaN(start) || isNaN(end) || start < YEAR_MIN || end > YEAR_MAX || start > end) {
        throw new ValidationError(`Invalid tahunPutusan range: ${tahunPutusan}`);
      }

      // Only filter if not the full default range
      if (start !== 2006 || end !== 2024) {
        conditions.push(`tanggal_putusan BETWEEN ${addParam(`${start}-01-01`)} AND ${addParam(`${end}-12-31`)}`);
      }
    }

    if (isValidParam(tahunPajak) && tahunPajak.includes(",")) {
      const [startRaw, endRaw] = tahunPajak.split(",");
      const start = parseInt(startRaw, 10);
      const end = parseInt(endRaw, 10);
      const YEAR_MIN = 1990;
      const YEAR_MAX = new Date().getFullYear() + 1;

      if (isNaN(start) || isNaN(end) || start < YEAR_MIN || end > YEAR_MAX || start > end) {
        throw new ValidationError(`Invalid tahunPajak range: ${tahunPajak}`);
      }

      if (start !== 2006 || end !== 2024) {
        conditions.push(`
          CASE
            WHEN tahun_pajak IS NULL OR tahun_pajak::text = '' THEN FALSE
            ELSE CAST(NULLIF(REGEXP_REPLACE(tahun_pajak::text, '[^0-9]', '', 'g'), '') AS INTEGER) BETWEEN ${addParam(start)} AND ${addParam(end)}
          END
        `);
      }
    }

    if (isValidParam(search)) {
      const searchParam = addParam(`%${search.trim()}%`);
      conditions.push(`to_jsonb(putusan_pajak)::text ILIKE ${searchParam}`);
    }

    const sql = `
      WITH filtered AS (
        SELECT
          id,
          nomor_putusan_pp,
          nomor_putusan_pk,
          pemohon,
          termohon,
          jenis_pajak,
          amar_putusan,
          upaya_hukum,
          tanggal_putusan,
          objek_sengketa,
          preview_sengketa,
          ${amarCategorySql()} AS amar_kategori
        FROM putusan_pajak
        WHERE ${conditions.join(" AND ")}
      )
      SELECT json_build_object(
        'items', COALESCE((
          SELECT json_agg(row_to_json(items_query))
          FROM (
            SELECT
              id, nomor_putusan_pp, nomor_putusan_pk, pemohon, termohon,
              jenis_pajak, amar_putusan, upaya_hukum, tanggal_putusan,
              objek_sengketa, preview_sengketa
            FROM filtered
            ORDER BY tanggal_putusan DESC NULLS LAST, id DESC
          ) AS items_query
        ), '[]'::json),
        'total', (SELECT COUNT(*) FROM filtered),
        'stats', json_build_object(
          'menolak', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'menolak'),
          'mengabulkan_seluruhnya', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'mengabulkan seluruhnya'),
          'mengabulkan_sebagian', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'mengabulkan sebagian'),
          'tidak_dapat_diterima', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'tidak dapat diterima'),
          'membatalkan', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'membatalkan'),
          'lainnya', (SELECT COUNT(*) FROM filtered WHERE amar_kategori = 'lainnya')
        )
      ) AS payload
    `;

    const result = await query(sql, values);
    return NextResponse.json(result.rows[0]?.payload ?? { items: [], total: 0, stats: {} });
  } catch (err) {
    return errorResponse(err);
  }
}
