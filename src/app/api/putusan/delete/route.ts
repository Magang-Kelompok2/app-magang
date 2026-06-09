// src/app/api/putusan/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "../../../../lib/db";
import {
  errorResponse,
  NotFoundError,
  ValidationError,
} from "../../../../lib/errors";
import { deletePutusanPdf } from "../../../../lib/minio";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^\d+$/.test(id)) {
      throw new ValidationError("Parameter id wajib berupa angka");
    }

    const existing = await query<{
      id: number;
      nama_file: string | null;
    }>(
      `
      SELECT id, nama_file
      FROM putusan_pajak
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (existing.rows.length === 0) {
      throw new NotFoundError(`Putusan dengan id '${id}'`);
    }

    const row = existing.rows[0];

    if (row.nama_file) {
      try {
        await deletePutusanPdf(row.nama_file);
      } catch (minioErr) {
        console.error("[DELETE PUTUSAN] Gagal hapus PDF dari MinIO:", minioErr);
      }
    }

    await withTransaction(async (client) => {
      await client.query(
        `
        DELETE FROM putusan_pajak
        WHERE id = $1
        `,
        [id],
      );
    });

    return NextResponse.json({
      message: "Putusan berhasil dihapus",
      deleted: row,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
