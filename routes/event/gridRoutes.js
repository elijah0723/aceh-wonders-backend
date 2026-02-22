import express from "express";
import multer from "multer";
import path from "path";
import db from "../../config/db.js";

const router = express.Router();

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/event"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

/* ================= GET ================= */

router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM grid_events ORDER BY created_at DESC",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal ambil grid events" });
      }
      res.json(rows);
    },
  );
});

/* ================= CREATE ================= */

router.post("/", upload.single("image"), (req, res) => {
  const { title, category, date, location } = req.body;

  if (!title || !category || !date) {
    return res.status(400).json({ message: "Field wajib belum lengkap" });
  }

  const image = req.file ? `/uploads/event/${req.file.filename}` : null;

  db.query(
    `INSERT INTO grid_events
     (title, category, date, location, image)
     VALUES (?, ?, ?, ?, ?)`,
    [title, category, date, location, image],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal tambah grid event" });
      }

      res.json({ id: result.insertId });
    },
  );
});

/* ================= UPDATE ================= */

router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { title, category, date, location } = req.body;

  const image = req.file ? `/uploads/event/${req.file.filename}` : null;

  const query = image
    ? `UPDATE grid_events
       SET title=?, category=?, date=?, location=?, image=?
       WHERE id=?`
    : `UPDATE grid_events
       SET title=?, category=?, date=?, location=?
       WHERE id=?`;

  const params = image
    ? [title, category, date, location, image, id]
    : [title, category, date, location, id];

  db.query(query, params, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal update grid event" });
    }

    res.json({ message: "Updated" });
  });
});

/* ================= DELETE ================= */

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM grid_events WHERE id=?", [req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal hapus grid event" });
    }

    res.json({ message: "Deleted" });
  });
});

export default router;
