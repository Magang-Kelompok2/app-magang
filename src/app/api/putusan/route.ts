// src/app/api/putusan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { errorResponse, ValidationError } from "../../..//lib/errors";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const jenisPajak = searchParams.get("jenisPajak");
    const upayaHukum = searchParams.get("upayaHukum");
    const pengadilan = searchParams.get("pengadilan");
    const tahunPutusan = searchParams.get("tahunPutusan");
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
      const arr = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (arr.length > 0) {
        conditions.push(`amar_putusan = ANY(${addParam(arr)}::text[])`);
      }
    }

    if (isValidParam(jenisPajak)) {
      const arr = jenisPajak.split(",").map((p) => p.trim()).filter(Boolean);
      if (arr.length > 0) {
        conditions.push(`jenis_pajak = ANY(${addParam(arr)}::text[])`);
      }
    }

    if (isValidParam(upayaHukum)) {
      const arr = upayaHukum.split(",").map((u) => u.trim()).filter(Boolean);
      if (arr.length > 0) {
        conditions.push(`upaya_hukum = ANY(${addParam(arr)}::text[])`);
      }
    }

    if (isValidParam(pengadilan) && pengadilan !== "Semua") {
      conditions.push(`pengadilan ILIKE ${addParam(`%${pengadilan.trim()}%`)}`);
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

    if (isValidParam(search)) {
      const searchParam = addParam(`%${search.trim()}%`);
      conditions.push(
        `(nomor_putusan_pp ILIKE ${searchParam} OR pemohon ILIKE ${searchParam} OR objek_sengketa ILIKE ${searchParam})`
      );
    }

    const sql = `
      SELECT
        id, nomor_putusan_pp, nomor_putusan_pk, pemohon, termohon,
        jenis_pajak, amar_putusan, upaya_hukum, tanggal_putusan,
        objek_sengketa, preview_sengketa
      FROM putusan_pajak
      WHERE ${conditions.join(" AND ")}
      ORDER BY tanggal_putusan DESC
      LIMIT 1000
    `;

    const result = await query(sql, values);
    return NextResponse.json(result.rows);
  } catch (err) {
    return errorResponse(err);
  }
}