// Simpan file ini di: db/seed.ts
// Jalankan dengan: npx ts-node db/seed.ts
// Install dulu jika belum: npm install bcryptjs @types/bcryptjs

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  host: "127.0.0.1",
  database: "alpha123",
  user: "alpha123",
  password: "alpha123",
  port: 5432,
});

async function seed() {
  const hashedPassword = await bcrypt.hash("terseram", 12);

  await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ["Vasilio", "vasilio@gmail.com", hashedPassword],
  );

  console.log("✅ Seed berhasil! User: admin@example.com / password123");
  await pool.end();
}

seed().catch(console.error);
