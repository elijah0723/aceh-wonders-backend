// routes/pages.js
import express from "express";
import multer from "multer";
import path from "path";
import db from "../../config/db.js";

console.log("DETAIL ROUTES VERSION: 2026-02-04 FIXED");

const router = express.Router();

// Folder upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/wisata/pages");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Generate slug
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/*
|---------------------------------------------------------------------------
| CREATE PAGE
|---------------------------------------------------------------------------
*/
router.post("/", upload.single("cover_image"), (req, res) => {
  const { title, content, category, lat, lng } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title wajib diisi" });
  }

  const slug = slugify(title);
  const image = req.file ? `/uploads/wisata/pages/${req.file.filename}` : null;

  const latValue = parseFloat(lat);
  const lngValue = parseFloat(lng);

  const sql = `
    INSERT INTO jlj_wisata
    (title, slug, category, cover_image, content, lat, lng, wisata_card_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      title,
      slug,
      category || null,
      image,
      content || "",
      !isNaN(latValue) ? latValue : null,
      !isNaN(lngValue) ? lngValue : null,
      null,
    ],
    (err, result) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json(err);
      }

      res.json({
        message: "Halaman wisata dibuat",
        id: result.insertId,
        slug,
      });
    },
  );
});

/*
|---------------------------------------------------------------------------
| GET ALL PAGES (ADMIN)
|---------------------------------------------------------------------------
*/
router.get("/", (req, res) => {
  db.query("SELECT * FROM jlj_wisata ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/*
|---------------------------------------------------------------------------
| GET PAGE BY SLUG (FRONTEND)
|---------------------------------------------------------------------------
*/
router.get("/detail/:slug", (req, res) => {
  console.log("SLUG MASUK:", req.params.slug);

  db.query(
    "SELECT * FROM jlj_wisata WHERE slug=?",
    [req.params.slug],
    (err, rows) => {
      if (err) {
        console.log("DB ERROR DETAIL:", err);
        return res.status(500).json(err);
      }

      if (!rows.length) {
        console.log("DATA TIDAK ADA");
        return res.status(404).json({ message: "Page tidak ditemukan" });
      }

      res.json(rows[0]);
    },
  );
});

/*
|---------------------------------------------------------------------------
| UPDATE PAGE
|---------------------------------------------------------------------------
*/
router.put("/:id", upload.single("cover_image"), (req, res) => {
  const { title, content, category, lat, lng, old_image } = req.body;

  const slug = slugify(title);
  const img = req.file
    ? `/uploads/wisata/pages/${req.file.filename}`
    : old_image;

  // Parse lat/lng aman
  const latValue = parseFloat(lat);
  const lngValue = parseFloat(lng);

  const sql = `
    UPDATE jlj_wisata
    SET title=?, slug=?, category=?, cover_image=?, content=?, lat=?, lng=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      title,
      slug,
      category,
      img,
      content,
      !isNaN(latValue) ? latValue : null,
      !isNaN(lngValue) ? lngValue : null,
      req.params.id,
    ],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Halaman diperbarui" });
    },
  );
});

router.put("/:id/hero", upload.single("cover_image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imagePath = `/uploads/wisata/pages/${req.file.filename}`;

  db.query(
    "UPDATE jlj_wisata SET cover_image=? WHERE id=?",
    [imagePath, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Hero updated",
        cover_image: imagePath,
      });
    },
  );
});


/*
|---------------------------------------------------------------------------
| DELETE PAGE
|---------------------------------------------------------------------------
*/
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM jlj_wisata WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Halaman dihapus" });
  });
});

/*
|---------------------------------------------------------------------------
| UPLOAD IMAGE FROM EDITOR (INLINE IMAGE)
|---------------------------------------------------------------------------
*/
router.post("/upload-editor-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    url: `/uploads/wisata/pages/${req.file.filename}`,
  });
});

export default router;
