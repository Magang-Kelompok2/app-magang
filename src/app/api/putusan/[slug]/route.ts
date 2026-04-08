// src/app/api/putusan/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../../lib/db";
import { errorResponse, NotFoundError, ValidationError } from "../../../../lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const { slug } = await params;
    const nomor = decodeURIComponent(slug).trim();

    if (!nomor || nomor.length > 200) {
      throw new ValidationError("Invalid putusan identifier");
    }

    const result = await query(
      `SELECT * FROM putusan_pajak
       WHERE nomor_putusan_pp = $1 OR nomor_putusan_pk = $1
       LIMIT 1`,
      [nomor]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`Putusan '${nomor}'`);
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return errorResponse(err);
  }
}