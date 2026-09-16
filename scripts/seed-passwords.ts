import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const SEED_PASSWORD = process.env.SEED_PASSWORD;
  if (!SEED_PASSWORD) throw new Error("SEED_PASSWORD is not set");

  const connection = await mysql.createConnection(databaseUrl);
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);
  await connection.execute("UPDATE staff SET password = ?", [hash]);
  await connection.end();
  console.log("Updated all staff passwords.");
}

main().then(() => process.exit(0));
