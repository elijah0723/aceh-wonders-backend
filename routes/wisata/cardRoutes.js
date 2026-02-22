import express from "express";
import multer from "multer";
import path from "path";
import slugify from "slugify";
import db from "../../config/db.js";

const router = express.Router();

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/wisata/cards"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

/* ================= GET ALL CARDS ================= */

router.get("/", (req, res) => {
  db.query("SELECT * FROM wisata_cards ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal ambil cards" });
    }
    res.json(rows);
  });
});

/* ================= INSERT / UPDATE STATIC ================= */

router.post("/", upload.single("image"), (req, res) => {
  const { title, static_key } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title wajib diisi" });
  }

  const slug = slugify(title, { lower: true, strict: true });
  const image_url = req.file
    ? `/uploads/wisata/cards/${req.file.filename}`
    : null;

  // ================= STATIC CARD =================
  if (static_key) {
    db.query(
      "SELECT * FROM wisata_cards WHERE static_key = ?",
      [static_key],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Gagal cek static card" });
        }

        if (rows.length > 0) {
          const query = image_url
            ? "UPDATE wisata_cards SET title=?, slug=?, image_url=? WHERE static_key=?"
            : "UPDATE wisata_cards SET title=?, slug=? WHERE static_key=?";

          const params = image_url
            ? [title, slug, image_url, static_key]
            : [title, slug, static_key];

          db.query(query, params, (err2) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ message: "Gagal update static" });
            }
            res.json({ message: "Static updated" });
          });
        } else {
          db.query(
            "INSERT INTO wisata_cards (title, slug, image_url, static_key) VALUES (?, ?, ?, ?)",
            [title, slug, image_url, static_key],
            (err3, result) => {
              if (err3) {
                console.error(err3);
                return res.status(500).json({ message: "Gagal insert static" });
              }
              res.json({ id: result.insertId });
            },
          );
        }
      },
    );
  }

  // ================= CUSTOM CARD =================
  else {
    db.query(
      "INSERT INTO wisata_cards (title, slug, image_url) VALUES (?, ?, ?)",
      [title, slug, image_url],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Gagal tambah card" });
        }
        res.json({ id: result.insertId, slug });
      },
    );
  }
});

/* ================= UPDATE CARD ================= */

router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title wajib diisi" });
  }

  const slug = slugify(title, { lower: true, strict: true });
  const image_url = req.file
    ? `/uploads/wisata/cards/${req.file.filename}`
    : null;

  const query = image_url
    ? "UPDATE wisata_cards SET title=?, slug=?, image_url=? WHERE id=?"
    : "UPDATE wisata_cards SET title=?, slug=? WHERE id=?";

  const params = image_url ? [title, slug, image_url, id] : [title, slug, id];

  db.query(query, params, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal update card" });
    }
    res.json({ message: "Card updated" });
  });
});

/* ================= DELETE ================= */

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM wisata_cards WHERE id=?", [req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal hapus" });
    }
    res.json({ message: "Card dihapus" });
  });
});

/* ================= DELETE STATIC RESET ================= */

router.delete("/static/:key", (req, res) => {
  db.query(
    "DELETE FROM wisata_cards WHERE static_key=?",
    [req.params.key],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal reset static" });
      }
      res.json({ message: "Static reset ke default" });
    },
  );
});

export default router;
