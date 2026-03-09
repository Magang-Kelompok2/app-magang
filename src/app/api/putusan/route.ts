import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Konfigurasi Database (Sesuaikan dengan kredensial Docker kamu)
const pool = new Pool({
  host: '127.0.0.1',
  database: 'alpha123',
  user: 'alpha123',
  password: 'alpha123',
  port: 5432,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Ambil parameter dari URL
    const status = searchParams.get('status');
    const jenisPajak = searchParams.get('jenisPajak');
    const upayaHukum = searchParams.get('upayaHukum');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM putusan_pajak WHERE 1=1';
    const values: any[] = [];

    // Logic Filter Dinamis
    if (status && status !== '') {
      const statusArray = status.split(',');
      values.push(statusArray);
      query += ` AND amar_putusan = ANY($${values.length})`;
    }

    if (jenisPajak && jenisPajak !== '') {
      const pajakArray = jenisPajak.split(',');
      values.push(pajakArray);
      query += ` AND jenis_pajak = ANY($${values.length})`;
    }

    if (search) {
      values.push(`%${search}%`);
      query += ` AND (nomor_putusan_pp ILIKE $${values.length} OR pemohon ILIKE $${values.length} OR objek_sengketa ILIKE $${values.length})`;
    }

    query += ' ORDER BY tanggal_putusan DESC';

    const result = await pool.query(query, values);
    
    // Pastikan mengembalikan NextResponse.json
    return NextResponse.json(result.rows);
    
  } catch (err: any) {
    console.error("Database Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

