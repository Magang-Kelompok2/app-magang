const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  host: "127.0.0.1",
  database: "KAPHA_db",
  user: "KAPHikmahArief",
  password: "KAPHA_secret_2026",
  port: 5432,
});

async function seed() {
  const hash = await bcrypt.hash("Mhc0rpj4kaL7", 12);
  await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ["MHCORP", "mhcorp@gmail.com", hash]
  );
  console.log("Selesai! User mhcorp@gmail.com sudah masuk.");
  await pool.end();
}

seed().catch(console.error);
