// app/api/test-db/route.ts  (App Router)
import { Pool } from 'pg'
import { NextResponse } from 'next/server'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
})

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM putusan_pajak'
    )
    return NextResponse.json({
      status: 'connected ✅',
      total_putusan: result.rows[0].total,
    })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error ❌', message: err.message },
      { status: 500 }
    )
  }
}