import express from "express";
import multer from "multer";
import path from "path";
import db from "../../config/db.js";
import slugify from "slugify";

const router = express.Router();

/* ================= MULTER VIDEO ================= */
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/home/videos");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const uploadVideo = multer({ storage: videoStorage });

/* ================= GET ALL HOME VIDEOS ================= */
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM home_videos ORDER BY sort_order ASC, id DESC",
    (err, rows) => {
      if (err) {
        console.log("HOME GET ERROR:", err);
        return res.status(500).json({ message: "DB error" });
      }
      res.json(rows);
    },
  );
});

/* ================= CREATE VIDEO ================= */
router.post("/", uploadVideo.single("video"), (req, res) => {
  const { title, caption } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Judul wajib" });
  }

  const slug = slugify(title, {
    lower: true,
    strict: true,
  });

  const video_url = req.file
    ? `/uploads/home/videos/${req.file.filename}`
    : null;

  db.query(
    "INSERT INTO home_videos (title, caption, slug, video_url, sort_order) VALUES (?, ?, ?, ?, 0)",
    [title, caption || "", slug, video_url],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      // ================= AUTO SYNC GLOBAL DETAIL =================
      db.query(
        "SELECT id FROM jelajahi_pages WHERE slug=?",
        [slug],
        (err2, rows) => {
          if (!rows.length) {
            db.query("INSERT INTO jelajahi_pages (title, slug) VALUES (?, ?)", [
              title,
              slug,
            ]);
          }
        },
      );
      // ===========================================================

      res.json({ message: "Created" });
    },
  );
});

/* ================= DELETE VIDEO ================= */
router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM home_videos WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Delete gagal" });

      if (!result.affectedRows) {
        return res.status(404).json({ message: "ID tidak ditemukan" });
      }

      res.json({ message: "Deleted" });
    },
  );
});

/* ================= REORDER VIDEO ================= */
router.put("/reorder", (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ message: "Invalid data" });
  }

  items.forEach((item, index) => {
    db.query("UPDATE home_videos SET sort_order=? WHERE id=?", [
      index,
      item.id,
    ]);
  });

  res.json({ message: "Reordered successfully" });
});

export default router;
