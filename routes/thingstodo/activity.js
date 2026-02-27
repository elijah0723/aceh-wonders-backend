import express from "express";
import multer from "multer";
import db from "../../config/db.js";
import slugify from "slugify";

const router = express.Router();

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: "uploads/things-to-do",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ================= GET ALL (CARD ONLY) ================= */
router.get("/", (req, res) => {
  db.query(
    `
    SELECT 
      id,
      title,
      slug,
      subtitle,
      description,
      image,
      detail_slug,
      order_index
    FROM things_to_do_activity
    ORDER BY order_index ASC
    `,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    },
  );
});

/* ================= CREATE ================= */
router.post("/", upload.single("image"), (req, res) => {
  const { title, subtitle, description } = req.body;

  const slug = slugify(title, { lower: true, strict: true });
  const image = req.file?.filename || null;

  // 1️⃣ Buat detail page dulu
  db.query(
    "INSERT INTO jelajahi_pages (title, slug, cover_image) VALUES (?, ?, ?)",
    [title, slug, image ? `/uploads/${image}` : null],
    (err, page) => {
      if (err) return res.status(500).json(err);

      // 2️⃣ Buat card activity
      db.query(
        `INSERT INTO things_to_do_activity 
         (title, slug, subtitle, description, image) 
         VALUES (?, ?, ?, ?, ?)`,
        [title, slug, subtitle, description, image],
        (err2) => {
          if (err2) return res.status(500).json(err2);
          res.json({ message: "Created successfully" });
        },
      );
    },
  );
});

/* ================= UPDATE ================= */
router.put("/:id", upload.single("image"), (req, res) => {
  const { title, subtitle, description } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const image = req.file?.filename;

  let query;
  let values;

  if (image) {
    query = `
      UPDATE things_to_do_activity
      SET title=?, slug=?, subtitle=?, description=?, image=?, detail_slug=?
      WHERE id=?`;
    values = [title, slug, subtitle, description, image, slug, req.params.id];
  } else {
    query = `
      UPDATE things_to_do_activity
      SET title=?, slug=?, subtitle=?, description=?, detail_slug=?
      WHERE id=?`;
    values = [title, slug, subtitle, description, slug, req.params.id];
  }

  db.query(query, values, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Updated successfully" });
  });
});

/* ================= DELETE ================= */
router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM things_to_do_activity WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Deleted successfully" });
    },
  );
});

export default router;
