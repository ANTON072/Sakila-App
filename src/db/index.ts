import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

// mysql2/promise の PromisePool は .config を持たないため、
// コールバック版 Pool を明示的に渡す（drizzle が .promise() で変換する）
const pool = mysql.createPool(databaseUrl);
export const db = drizzle({ client: pool });
