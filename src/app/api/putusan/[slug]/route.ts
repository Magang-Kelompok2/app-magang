import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  database: process.env.DB_NAME || "KAPHA_db",
  user: process.env.DB_USER || "KAPHikmahArief",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "KAPHA_secret_2026",
  port: 5432,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const nomor = decodeURIComponent(slug);

  try {
    const result = await pool.query(
      `SELECT * FROM putusan_pajak 
       WHERE nomor_putusan_pp = $1 
          OR nomor_putusan_pk = $1 
       LIMIT 1`,
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