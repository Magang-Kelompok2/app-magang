import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'alpha123',
  user: process.env.DB_USER || 'alpha123',
  password: process.env.DB_PASSWORD || 'alpha123',
  port: 5432,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const isValid = (val: string | null) => {
      return val && val.trim() !== "" && val !== "[]" && val !== "all" && val !== "undefined" && val !== "null";
    };

    const status = searchParams.get('status');
    const jenisPajak = searchParams.get('jenisPajak');
    const upayaHukum = searchParams.get('upayaHukum');
    const pengadilan = searchParams.get('pengadilan');
    const tahunPutusan = searchParams.get('tahunPutusan');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM putusan_pajak WHERE 1=1';
    const values: any[] = [];

    // 1. Filter Status (Multi-select fix)
    if (isValid(status)) {
      const arr = status!.split(',').filter(Boolean).map(s => s.trim());
      if (arr.length > 0) {
        values.push(arr);
        // Menggunakan ANY agar mencari salah satu dari pilihan (OR logic dalam array)
        query += ` AND amar_putusan = ANY($${values.length}::text[])`;
      }
    }

    // 2. Filter Jenis Pajak (Multi-select fix)
    if (isValid(jenisPajak)) {
      const arr = jenisPajak!.split(',').filter(Boolean).map(p => p.trim());
      if (arr.length > 0) {
        values.push(arr);
        query += ` AND jenis_pajak = ANY($${values.length}::text[])`;
      }
    }

    // 3. Filter Upaya Hukum
    if (isValid(upayaHukum)) {
      const arr = upayaHukum!.split(',').filter(Boolean).map(u => u.trim());
      if (arr.length > 0) {
        values.push(arr);
        query += ` AND upaya_hukum = ANY($${values.length}::text[])`;
      }
    }

    // 4. Filter Pengadilan (Fix: Case-Insensitive & Partial Match)
      if (isValid(pengadilan) && pengadilan !== 'Semua') {
    const trimmed = (pengadilan ?? '').trim();
    values.push(`%${trimmed}%`);
    query += ` AND pengadilan ILIKE $${values.length}`;
  }

    // 5. Filter Tahun
    if (isValid(tahunPutusan) && tahunPutusan!.includes(',')) {
      const [start, end] = tahunPutusan!.split(',');
      if (start !== '2006' || end !== '2024') {
        values.push(`${start}-01-01`);
        const sIdx = values.length;
        values.push(`${end}-12-31`);
        const eIdx = values.length;
        query += ` AND tanggal_putusan BETWEEN $${sIdx} AND $${eIdx}`;
      }
    }

    // 6. Global Search
    if (isValid(search)) {
      values.push(`%${search}%`);
      const idx = values.length;
      query += ` AND (nomor_putusan_pp ILIKE $${idx} OR pemohon ILIKE $${idx} OR objek_sengketa ILIKE $${idx})`;
    }

    query += ' ORDER BY tanggal_putusan DESC';

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
    
  } catch (err: any) {
    console.error("Database Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}