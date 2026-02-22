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
    "SELECT * FROM popular_events ORDER BY created_at DESC",
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal ambil events" });
      }
      res.json(rows);
    },
  );
});

/* ================= CREATE ================= */

router.post("/", upload.single("image"), (req, res) => {
  const { title, subtitle, date, location, size, speed } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title wajib diisi" });
  }

  const image = req.file ? `/uploads/event/${req.file.filename}` : null;

  db.query(
    `INSERT INTO popular_events
     (title, subtitle, date, location, image, size, speed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, subtitle, date, location, image, size, speed],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal tambah event" });
      }

      res.json({ id: result.insertId });
    },
  );
});

/* ================= UPDATE ================= */

router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { title, subtitle, date, location, size, speed } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title wajib diisi" });
  }

  const image = req.file ? `/uploads/event/${req.file.filename}` : null;

  const query = image
    ? `UPDATE popular_events
       SET title=?, subtitle=?, date=?, location=?, size=?, speed=?, image=?
       WHERE id=?`
    : `UPDATE popular_events
       SET title=?, subtitle=?, date=?, location=?, size=?, speed=?
       WHERE id=?`;

  const params = image
    ? [title, subtitle, date, location, size, speed, image, id]
    : [title, subtitle, date, location, size, speed, id];

  db.query(query, params, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal update event" });
    }

    res.json({ message: "Updated" });
  });
});

/* ================= DELETE ================= */

router.delete("/:id", (req, res) => {
  db.query("DELETE FROM popular_events WHERE id=?", [req.params.id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal hapus event" });
    }

    res.json({ message: "Deleted" });
  });
});

export default router;
