import express from "express";
import multer from "multer";
import path from "path";
import db from "../../config/db.js";

const router = express.Router();

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/wisata/hero"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

/* ================= GET HERO ================= */

router.get("/", (req, res) => {
  const sql =
    "SELECT * FROM wisata WHERE section_name='hero' ORDER BY created_at DESC";

  db.query(sql, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal ambil hero" });
    }
    res.json(rows || []);
  });
});

/* ================= POST HERO ================= */

router.post("/", upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "File tidak ditemukan" });

  const { caption } = req.body;
  const image = req.file.filename;

  const sql =
    "INSERT INTO wisata (section_name, image, caption) VALUES ('hero', ?, ?)";

  db.query(sql, [image, caption], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal upload hero" });
    }

    res.json({
      id: result.insertId,
      image,
      caption,
    });
  });
});

/* ================= DELETE HERO ================= */

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM wisata WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Gagal hapus hero" });

    res.json({ message: "Hero dihapus" });
  });
});

export default router;
