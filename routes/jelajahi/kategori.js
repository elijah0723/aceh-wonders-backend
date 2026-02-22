import express from "express";
import db from "../../config/db.js";
import slugify from "slugify";
import multer from "multer";
import path from "path";

const router = express.Router();

/* ===============================
   MULTER CONFIG
=============================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/jelajahi/images");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const uploadImage = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image allowed"), false);
    }
    cb(null, true);
  },
});


const upload = multer({ storage });

/* ===============================
   GET ALL KATEGORI
=============================== */
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM jelajahi_kategori ORDER BY created_at DESC",
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    },
  );
});

/* ===============================
   CREATE KATEGORI
=============================== */
router.post("/", upload.single("gambar"), (req, res) => {
  const { nama, deskripsi, wilayah } = req.body;

  if (!nama) {
    return res.status(400).json({ message: "Nama wajib diisi" });
  }

  const slug = slugify(nama, { lower: true, strict: true });
  const gambar = req.file ? req.file.filename : null;

  db.query(
    `
    INSERT INTO jelajahi_kategori
    (nama, slug, deskripsi, gambar, wilayah)
    VALUES (?, ?, ?, ?, ?)
    `,
    [nama, slug, deskripsi || "", gambar, wilayah || ""],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        id: result.insertId,
        nama,
        slug,
        deskripsi,
        gambar,
        wilayah: wilayah || "",
      });
    },
  );
});

// ===============================
// UPDATE KATEGORI (FULL)
// ===============================
router.put("/:id", uploadImage.single("gambar"), (req, res) => {
  const { id } = req.params;
  const { nama, deskripsi, intro_text } = req.body;

  if (!nama) {
    return res.status(400).json({ message: "Nama wajib diisi" });
  }

  let sql = `
      UPDATE jelajahi_kategori
      SET nama = ?, deskripsi = ?, intro_text = ?
    `;

  const values = [nama, deskripsi || "", intro_text || ""];

  if (req.file) {
    sql += `, gambar = ?`;
    values.push(req.file.filename);
  }

  sql += ` WHERE id = ?`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    res.json({ message: "Kategori berhasil diupdate" });
  });
});

/* ===============================
   DELETE KATEGORI + SEMUA WISATA
=============================== */
router.delete("/:id", (req, res) => {
  const kategoriId = Number(req.params.id);

  if (!kategoriId) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  // ambil semua page_id yang ada di kategori ini
  db.query(
    "SELECT page_id FROM jelajahi_wisata WHERE kategori_id = ?",
    [kategoriId],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      const pageIds = rows.map(r => r.page_id);

      // hapus relasi wisata
      db.query(
        "DELETE FROM jelajahi_wisata WHERE kategori_id = ?",
        [kategoriId],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          // hapus semua pages yang terkait
          if (pageIds.length > 0) {
            db.query(
              "DELETE FROM jelajahi_pages WHERE id IN (?)",
              [pageIds],
              (err3) => {
                if (err3) return res.status(500).json(err3);

                // terakhir hapus kategori
                db.query(
                  "DELETE FROM jelajahi_kategori WHERE id = ?",
                  [kategoriId],
                  (err4) => {
                    if (err4) return res.status(500).json(err4);
                    res.json({ success: true });
                  }
                );
              }
            );
          } else {
            // kalau tidak ada wisata, langsung hapus kategori
            db.query(
              "DELETE FROM jelajahi_kategori WHERE id = ?",
              [kategoriId],
              (err4) => {
                if (err4) return res.status(500).json(err4);
                res.json({ success: true });
              }
            );
          }
        }
      );
    }
  );
});

/* ===============================
   GET KATEGORI BY SLUG
   🔥 PALING BAWAH
=============================== */
router.get("/:slug", (req, res) => {
  const { slug } = req.params;

  db.query(
    "SELECT * FROM jelajahi_kategori WHERE slug = ? LIMIT 1",
    [slug],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (!rows.length) return res.status(404).json({ message: "Not found" });
      res.json(rows[0]);
    },
  );
});


export default router;
