import express from "express";
import db from "../../config/db.js";
import multer from "multer";
import path from "path";
import slugify from "slugify";

const router = express.Router();

/* ===============================
   MULTER
=============================== */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/jelajahi/images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ===============================
   GET WISATA BY KATEGORI
=============================== */
router.get("/kategori/:kategoriId", (req, res) => {
  db.query(
    `
    SELECT
      jw.id AS wisata_id,
      jw.order_index,
      jp.id AS page_id,
      jp.title,
      jp.slug,
      jp.cover_image
    FROM jelajahi_wisata jw
    JOIN jelajahi_pages jp ON jp.id = jw.page_id
    WHERE jw.kategori_id = ?
    ORDER BY jw.order_index ASC
    `,
    [req.params.kategoriId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    },
  );
});

/* ===============================
   CREATE WISATA
=============================== */
router.post("/", upload.single("cover_image"), (req, res) => {
  const { title, kategori_id, order_index } = req.body;

  if (!title || !kategori_id || !req.file) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  const slug = slugify(title, { lower: true, strict: true });
  const imagePath = "/uploads/jelajahi/images/" + req.file.filename;

  db.query(
    "INSERT INTO jelajahi_pages (title, slug, cover_image) VALUES (?,?,?)",
    [title, slug, imagePath],
    (err, page) => {
      if (err) return res.status(500).json(err);

      db.query(
        "INSERT INTO jelajahi_wisata (kategori_id, page_id, order_index) VALUES (?,?,?)",
        [kategori_id, page.insertId, order_index ?? 0],
        (err2) => {
          if (err2) return res.status(500).json(err2);
          res.json({ success: true });
        },
      );
    },
  );
});

/* ===============================
   EDIT WISATA
=============================== */
router.put("/:wisataId", upload.single("cover_image"), (req, res) => {
  const { title, order_index } = req.body;
  const wisataId = req.params.wisataId;

  if (!title) {
    return res.status(400).json({ message: "Judul wajib" });
  }

  const slug = slugify(title, { lower: true, strict: true });

  let imgSql = "";
  let imgVal = [];

  if (req.file) {
    imgSql = ", jp.cover_image = ?";
    imgVal.push("/uploads/jelajahi/images/" + req.file.filename);
  }

  db.query(
    `
    UPDATE jelajahi_pages jp
    JOIN jelajahi_wisata jw ON jw.page_id = jp.id
    SET jp.title = ?, jp.slug = ? ${imgSql}, jw.order_index = ?
    WHERE jw.id = ?
    `,
    [title, slug, ...imgVal, order_index ?? 0, wisataId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    },
  );
});

/* ===============================
   DELETE WISATA
=============================== */
router.delete("/:wisata_id", (req, res) => {
  const wisataId = Number(req.params.wisata_id);

  if (!wisataId) {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  // Hapus relasi dulu
  db.query(
    "SELECT page_id FROM jelajahi_wisata WHERE id = ?",
    [wisataId],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
      }

      const pageId = rows[0].page_id;

      // Hapus dari jelajahi_wisata
      db.query(
        "DELETE FROM jelajahi_wisata WHERE id = ?",
        [wisataId],
        (err2) => {
          if (err2) return res.status(500).json(err2);

          // Hapus halaman
          db.query(
            "DELETE FROM jelajahi_pages WHERE id = ?",
            [pageId],
            (err3) => {
              if (err3) return res.status(500).json(err3);

              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});


export default router;
