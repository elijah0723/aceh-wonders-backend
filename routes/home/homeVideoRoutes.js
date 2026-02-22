import express from "express";
import multer from "multer";
import path from "path";
import db from "../../config/db.js";
import slugify from "slugify";

const router = express.Router();

/* ===============================
   MULTER VIDEO
=============================== */
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

/* ===============================
   MULTER IMAGE (HERO)
=============================== */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/home/images");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image allowed"), false);
    }
    cb(null, true);
  },
});

/* ===============================
   GET ALL HOME VIDEOS
=============================== */
router.get("/", (req, res) => {
  db.query("SELECT * FROM home_videos ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

/* ===============================
   CREATE / UPDATE VIDEO (ADMIN HOME)
=============================== */
router.post("/", uploadVideo.single("video"), (req, res) => {
  const { title, caption, static_key, page_id, content, map_embed } = req.body;

  /* ===== UPDATE PAGE CONTENT (TEXT + MAP) ===== */
  if (page_id) {
    db.query(
      "UPDATE home_videos SET title=?, content=?, map_embed=? WHERE id=?",
      [title, content, map_embed || null, page_id],
      (err) => {
        if (err) return res.status(500).json({ message: "DB error" });
        return res.json({ message: "Page content updated" });
      },
    );
    return;
  }

  /* ===== VIDEO ===== */
  if (!title) {
    return res.status(400).json({ message: "Judul wajib" });
  }

  const slug = slugify(title, { lower: true, strict: true });

  const video_url = req.file
    ? `/uploads/home/videos/${req.file.filename}`
    : null;

  /* ===== STATIC ===== */
  if (static_key) {
    db.query(
      "SELECT id FROM home_videos WHERE static_key=?",
      [static_key],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error" });

        if (rows.length) {
          db.query(
            "UPDATE home_videos SET title=?, caption=?, slug=?, video_url=? WHERE static_key=?",
            [title, caption, slug, video_url, static_key],
            () => res.json({ message: "Static updated" }),
          );
        } else {
          db.query(
            "INSERT INTO home_videos (title, caption, slug, video_url, static_key) VALUES (?, ?, ?, ?, ?)",
            [title, caption, slug, video_url, static_key],
            () => res.json({ message: "Static created" }),
          );
        }
      },
    );
    return;
  }

  /* ===== NORMAL VIDEO ===== */
  db.query(
    "INSERT INTO home_videos (title, caption, slug, video_url) VALUES (?, ?, ?, ?)",
    [title, caption, slug, video_url],
    () => res.json({ message: "Created" }),
  );
});

/* ===============================
   DELETE VIDEO
=============================== */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM home_videos WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Delete gagal" });
    if (!result.affectedRows) {
      return res.status(404).json({ message: "ID tidak ditemukan" });
    }
    res.json({ message: "Deleted" });
  });
});

/* ===============================
   PAGE DETAIL BY SLUG
=============================== */
router.get("/pages/detail/:slug", (req, res) => {
  const reqSlug = req.params.slug;

  db.query("SELECT * FROM home_videos", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });

    const found = rows.find(
      (r) =>
        r.slug === reqSlug ||
        slugify(r.title || "", { lower: true, strict: true }) === reqSlug,
    );

    if (!found) return res.status(404).json({ message: "Not found" });

    res.json(found);
  });
});

/* ===============================
   UPDATE PAGE DETAIL (TEXT + MAP)
=============================== */
router.put("/pages/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, lat, lng } = req.body;

  db.query(
    "UPDATE home_videos SET title=?, content=?, lat=?, lng=? WHERE id=?",
    [title, content, lat || null, lng || null, id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      res.json({ message: "Page updated" });
    }
  );
});


/* ===============================
   UPDATE HERO IMAGE
=============================== */
router.put("/pages/:id/hero", uploadImage.single("cover_image"), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const imagePath = `/uploads/home/images/${req.file.filename}`;

  db.query(
    "UPDATE home_videos SET cover_image=? WHERE id=?",
    [imagePath, id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB error" });

      res.json({
        message: "Hero updated",
        cover_image: imagePath,
      });
    },
  );
});

export default router;
