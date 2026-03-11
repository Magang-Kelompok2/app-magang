// Simpan di: db/migrations/001_create_users.ts
// Jalankan: npx ts-node db/migrations/001_create_users.ts

import { Pool } from "pg";

const pool = new Pool({
  host: "127.0.0.1",
  database: "alpha123",
  user: "alpha123",
  password: "alpha123",
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
