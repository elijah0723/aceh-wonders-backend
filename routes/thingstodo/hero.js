import express from "express";
import multer from "multer";
import db from "../../config/db.js";

const router = express.Router();

/* ======================
   MULTER
====================== */
const storage = multer.diskStorage({
  destination: "uploads/hero/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ======================
   GET HERO BY PAGE
====================== */
router.get("/:page", (req, res) => {
  const { page } = req.params;

  db.query(
    "SELECT * FROM heros WHERE page = ? LIMIT 1",
    [page],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || null);
    }
  );
});

/* ======================
   UPDATE HERO BY PAGE
====================== */
router.put("/:page", upload.single("image"), (req, res) => {
  const { page } = req.params;
  const { title, subtitle } = req.body;
  const image = req.file?.filename;

  let query;
  let values;

  if (image) {
    query = `
      UPDATE heros
      SET title=?, subtitle=?, image=?
      WHERE page=?
    `;
    values = [title, subtitle, image, page];
  } else {
    query = `
      UPDATE heros
      SET title=?, subtitle=?
      WHERE page=?
    `;
    values = [title, subtitle, page];
  }

  db.query(query, values, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Hero updated successfully" });
  });
});

export default router;