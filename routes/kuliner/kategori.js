import express from "express";
import db from "../../config/db.js";
import slugify from "slugify";
import multer from "multer";
import path from "path";
import fs from "fs";


const router = express.Router();

/* =========================
   GET ALL
========================= */
router.get("/", (req, res) => {
  db.query("SELECT * FROM kuliner_kategori ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(rows);
  });
});

/* =========================
   GET BY SLUG
========================= */
router.get("/:slug", (req, res) => {
  db.query(
    "SELECT * FROM kuliner_kategori WHERE slug = ?",
    [req.params.slug],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Kategori tidak ditemukan" });
      }

      res.json(rows[0]);
    },
  );
});

/* =========================
   CREATE
========================= */
router.post("/", (req, res) => {
  const { nama, deskripsi, intro_text } = req.body;

  if (!nama) {
    return res.status(400).json({ message: "Nama wajib diisi" });
  }

  const slug = slugify(nama, { lower: true, strict: true });

  db.query(
    "INSERT INTO kuliner_kategori (nama, slug, deskripsi, intro_text) VALUES (?, ?, ?, ?)",
    [nama, slug, deskripsi || null, intro_text || null],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "Kategori berhasil dibuat" });
    },
  );
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/kuliner/kategori";

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.put(
  "/:id/hero",
  upload.fields([
    { name: "hero_small", maxCount: 1 },
    { name: "hero_large", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const heroSmall = req.files["hero_small"]
        ? req.files["hero_small"][0].filename
        : null;

      const heroLarge = req.files["hero_large"]
        ? req.files["hero_large"][0].filename
        : null;

      await db.promise().query(
        `UPDATE kuliner_kategori 
         SET hero_small = COALESCE(?, hero_small),
             hero_large = COALESCE(?, hero_large)
         WHERE id = ?`,
        [heroSmall, heroLarge, req.params.id],
      );

      res.json({ message: "Hero updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);


/* =========================
   UPDATE
========================= */
router.put("/:id", (req, res) => {
  const { nama, deskripsi, intro_text } = req.body;

  const slug = slugify(nama, { lower: true, strict: true });

  db.query(
    "UPDATE kuliner_kategori SET nama=?, slug=?, deskripsi=?, intro_text=? WHERE id=?",
    [nama, slug, deskripsi || null, intro_text || null, req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "Kategori berhasil diupdate" });
    },
  );
});

/* =========================
   DELETE
========================= */
router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM kuliner_kategori WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "Kategori berhasil dihapus" });
    },
  );
});

/* =======================================================
   DELETE VERTICAL VIDEO
======================================================= */

router.delete("/:id/video", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT vertical_video FROM kuliner_item WHERE id=?",
        [req.params.id]
      );

    if (!rows.length) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const video = rows[0].vertical_video;

    if (video) {
      const filePath = "uploads/kuliner/items/video/" + video;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await db
        .promise()
        .query(
          "UPDATE kuliner_item SET vertical_video=NULL WHERE id=?",
          [req.params.id]
        );
    }

    res.json({ message: "Video berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
