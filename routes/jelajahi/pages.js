import express from "express";
import multer from "multer";
import path from "path";
import slugify from "slugify";
import db from "../../config/db.js";

const router = express.Router();

/* ===============================
   MULTER - HERO IMAGE
=============================== */
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/jelajahi/images");
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
   GET PAGE DETAIL BY SLUG
   dipakai PageDetail.jsx
=============================== */
router.get("/detail/:slug", (req, res) => {
  const { slug } = req.params;

  db.query(
    "SELECT * FROM jelajahi_pages WHERE slug = ? LIMIT 1",
    [slug],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Not found" });
      }

      res.json(rows[0]);
    },
  );
});

/* ===============================
   CREATE PAGE (ADMIN)
=============================== */
router.post("/", (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  const slug = slugify(title, {
    lower: true,
    strict: true,
  });

  db.query(
    "INSERT INTO jelajahi_pages (title, slug) VALUES (?, ?)",
    [title, slug],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      res.json({
        message: "Page created",
        id: result.insertId,
        slug,
      });
    },
  );
});

/* ===============================
   UPDATE PAGE CONTENT + MAP
=============================== */
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, lat, lng } = req.body;

  db.query(
    `
    UPDATE jelajahi_pages
    SET
      title = ?,
      content = ?,
      lat = ?,
      lng = ?
    WHERE id = ?
    `,
    [title || "", content || null, lat || null, lng || null, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json({ message: "Page updated" });
    },
  );
});

/* ===============================
   UPDATE HERO IMAGE
=============================== */
router.put("/:id/hero", uploadImage.single("cover_image"), (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const imagePath = "/uploads/jelajahi/images/" + req.file.filename;

  db.query(
    "UPDATE jelajahi_pages SET cover_image = ? WHERE id = ?",
    [imagePath, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Page not found" });
      }

      res.json({
        message: "Hero updated",
        cover_image: imagePath,
      });
    },
  );
});

/* ===============================
   UPLOAD IMAGE FROM EDITOR
=============================== */
router.post("/upload-editor-image", uploadImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    url: `/uploads/jelajahi/images/${req.file.filename}`,
  });
});

/* ===============================
   DELETE PAGE
=============================== */
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM jelajahi_pages WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json({ message: "Page deleted" });
  });
});

/* ===============================
   GET ALL PAGES (ADMIN LIST)
=============================== */
router.get("/", (req, res) => {
  db.query(
    `
    SELECT 
      id,
      title,
      slug,
      cover_image,
      created_at
    FROM jelajahi_pages
    ORDER BY created_at DESC
    `,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "DB error" });
      }

      res.json(rows);
    },
  );
});

export default router;
