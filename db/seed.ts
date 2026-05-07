// Simpan file ini di: db/seed.ts
// Jalankan dengan: npx ts-node db/seed.ts

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  host: process.env.DB_HOST || "76.13.222.194",
  database: process.env.DB_NAME || "alpha123",
  user: process.env.DB_USER || "alpha",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "alpha123",
  port: 5432,
});

async function seed() {
  const hashedPassword = await bcrypt.hash("Mhc0rpj4kaL7", 12);

  await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ["MHCORP", "mhcorp@gmail.com", hashedPassword],
  );

  console.log(" Seed berhasil! User: mhcorp@gmail.com");
  await pool.end();
}

seed().catch(console.error);
