import fs from "fs";
import path from "path";
import db from "./config/db.js";

const DB_NAME = "db_acehwonders";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function runCleaner() {
  console.log("🔎 Collecting filenames from database...");

  const usedFiles = new Set();

  // Ambil semua tabel
  const [tables] = await db.promise().query(
    `
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = ?
  `,
    [DB_NAME],
  );

  for (const table of tables) {
    const tableName = table.TABLE_NAME;

    const [rows] = await db.promise().query(`SELECT * FROM \`${tableName}\``);

    rows.forEach((row) => {
      Object.values(row).forEach((value) => {
        if (typeof value === "string") {
          // Ambil semua kemungkinan filename dengan regex
          const matches = value.match(
            /\b[\w-]+\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)\b/gi,
          );
          if (matches) {
            matches.forEach((file) => usedFiles.add(file));
          }
        }
      });
    });
  }

  console.log("✅ Files referenced in DB:", usedFiles.size);

  if (!usedFiles.size) {
    console.log("❌ Tidak ada file ditemukan di DB. STOP.");
    process.exit();
  }

  function scanFolder(folder) {
    fs.readdirSync(folder).forEach((file) => {
      const fullPath = path.join(folder, file);

      if (fs.statSync(fullPath).isDirectory()) {
        scanFolder(fullPath);
      } else {
        if (!usedFiles.has(file)) {
          fs.unlinkSync(fullPath);
          console.log("🗑 Deleted:", file);
        }
      }
    });
  }

  scanFolder(UPLOAD_DIR);

  console.log("✨ Cleanup selesai.");
  process.exit();
}

runCleaner();
