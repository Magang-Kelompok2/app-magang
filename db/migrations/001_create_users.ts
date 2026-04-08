// Simpan di: db/migrations/001_create_users.ts
// Jalankan: npx ts-node db/migrations/001_create_users.ts

import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  database: process.env.DB_NAME || "KAPHA_db",
  user: process.env.DB_USER || "KAPHikmahArief",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "KAPHA_secret_2026",
  port: 5432,
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) NOT NULL UNIQUE,
      password    VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Migration berhasil! Tabel users sudah dibuat.");
  await pool.end();
}

migrate().catch(console.error);
