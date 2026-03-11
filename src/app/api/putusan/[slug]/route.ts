import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: "127.0.0.1",
  database: "alpha123",
  user: "alpha123",
  password: "alpha123",
  port: 5432,
});

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const nomor = decodeURIComponent(params.slug);

  try {
    const result = await pool.query(
      `SELECT * FROM putusan_pajak WHERE nomor_putusan_pp = $1 LIMIT 1`,
      [nomor]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: `Putusan '${nomor}' tidak ditemukan` },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error("Database Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}