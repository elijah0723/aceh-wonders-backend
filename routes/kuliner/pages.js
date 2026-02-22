import express from "express";
import db from "../../config/db.js";
import slugify from "slugify";
import multer from "multer";
import path from "path";

const router = express.Router();

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: "uploads/kuliner/pages/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ================= GET DETAIL BY SLUG ================= */

router.get("/detail/:slug", (req, res) => {
  db.query(
    "SELECT * FROM kuliner_pages WHERE slug = ?",
    [req.params.slug],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }

      res.json(rows[0]);
    },
  );
});

router.get("/by-item/:itemId", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query("SELECT slug FROM kuliner_pages WHERE item_id = ?", [
        req.params.itemId,
      ]);

    if (!rows.length) {
      return res.status(404).json({ message: "Page tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ================= CREATE PAGE ================= */
router.post("/", upload.single("gambar"), async (req, res) => {
  try {
    const { kategori_id, nama, deskripsi } = req.body;

    if (!kategori_id || !nama) {
      return res.status(400).json({ message: "Kategori & Nama wajib diisi" });
    }

    const slug = slugify(nama, {
      lower: true,
      strict: true,
    });

    const gambar = req.file ? req.file.filename : null;

    const [result] = await db.promise().query(
      `
      INSERT INTO kuliner_item 
      (kategori_id, nama, slug, deskripsi, gambar, is_signature) 
      VALUES (?, ?, ?, ?, ?, 0)
      `,
      [kategori_id, nama, slug, deskripsi || null, gambar],
    );

    res.json({
      message: "Item berhasil ditambahkan",
      id: result.insertId,
      slug,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ================= UPDATE CONTENT ================= */

router.put("/:id", (req, res) => {
  const { title, content, lat, lng } = req.body;

  const slug = slugify(title, { lower: true, strict: true });

  db.query(
    "UPDATE kuliner_pages SET title=?, slug=?, content=?, lat=?, lng=? WHERE id=?",
    [title, slug, content, lat, lng, req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "Berhasil diupdate" });
    },
  );
});

/* ================= UPDATE HERO IMAGE ================= */

router.put("/:id/hero", upload.single("cover_image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File tidak ada" });
  }

  const imagePath = `/uploads/kuliner/pages/${req.file.filename}`;

  db.query(
    "UPDATE kuliner_pages SET cover_image=? WHERE id=?",
    [imagePath, req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "Hero berhasil diupdate" });
    },
  );
});

export default router;
