import express from "express";
import db from "../../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import slugify from "slugify";

const router = express.Router();

/* =======================================================
   STORAGE CONFIG
======================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/kuliner/items";

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
/* =======================================================
   STORAGE VIDEO
======================================================= */

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/kuliner/items/video";

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const uploadVideo = multer({ storage: videoStorage });


/* =======================================================
   GET ITEM BY KATEGORI
======================================================= */

router.get("/kategori/:kategori_id", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM kuliner_item WHERE kategori_id = ? ORDER BY id DESC",
        [req.params.kategori_id],
      );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================================================
   CREATE ITEM
======================================================= */

router.post("/", upload.single("gambar"), async (req, res) => {
  try {
    const { kategori_id, nama, deskripsi } = req.body;

    if (!kategori_id || !nama) {
      return res.status(400).json({ message: "Kategori & Nama wajib diisi" });
    }

    const slug = slugify(nama, {
      lower: true,
      strict: true,
    });

    const gambar = req.file ? req.file.filename : null;

    await db.promise().query(
      `
      INSERT INTO kuliner_item 
      (kategori_id, nama, slug, deskripsi, gambar, is_signature) 
      VALUES (?, ?, ?, ?, ?, 0)
      `,
      [kategori_id, nama, slug, deskripsi || null, gambar],
    );

    res.json({ message: "Item berhasil ditambahkan", slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =======================================================
   UPDATE ITEM (SUPPORT SIGNATURE)
======================================================= */

router.put("/:id", upload.single("gambar"), async (req, res) => {
  try {
    const { nama, deskripsi, is_signature } = req.body;

    const [oldData] = await db
      .promise()
      .query("SELECT gambar FROM kuliner_item WHERE id=?", [req.params.id]);

    if (!oldData.length) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    let gambar = oldData[0].gambar;
    let slug = null;

    // Kalau update nama
    if (nama) {
      slug = slugify(nama, {
        lower: true,
        strict: true,
      });
    }

    // Kalau upload gambar baru
    if (req.file) {
      gambar = req.file.filename;

      if (oldData[0].gambar) {
        const oldPath = "uploads/kuliner/items/" + oldData[0].gambar;

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await db.promise().query(
      `
      UPDATE kuliner_item 
      SET 
        nama = COALESCE(?, nama),
        slug = COALESCE(?, slug),
        deskripsi = COALESCE(?, deskripsi),
        gambar = COALESCE(?, gambar),
        is_signature = COALESCE(?, is_signature)
      WHERE id = ?
      `,
      [
        nama || null,
        slug || null,
        deskripsi || null,
        gambar || null,
        is_signature !== undefined ? is_signature : null,
        req.params.id,
      ],
    );

    res.json({ message: "Item berhasil diupdate" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
/* =======================================================
   UPLOAD VERTICAL VIDEO
======================================================= */

router.put(
  "/:id/video",
  uploadVideo.single("vertical_video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Video wajib diupload" });
      }

      const [oldData] = await db
        .promise()
        .query(
          "SELECT vertical_video FROM kuliner_item WHERE id=?",
          [req.params.id]
        );

      // Hapus video lama kalau ada
      if (oldData.length && oldData[0].vertical_video) {
        const oldPath =
          "uploads/kuliner/items/video/" +
          oldData[0].vertical_video;

        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      await db.promise().query(
        "UPDATE kuliner_item SET vertical_video=? WHERE id=?",
        [req.file.filename, req.params.id]
      );

      res.json({ message: "Video berhasil diupload" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =======================================================
   DELETE VERTICAL VIDEO
======================================================= */

router.delete("/:id/video", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT vertical_video FROM kuliner_item WHERE id=?",
        [req.params.id]
      );

    if (!rows.length) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const video = rows[0].vertical_video;

    if (!video) {
      return res.status(400).json({ message: "Video tidak ada" });
    }

    const filePath = "uploads/kuliner/items/video/" + video;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db
      .promise()
      .query(
        "UPDATE kuliner_item SET vertical_video=NULL WHERE id=?",
        [req.params.id]
      );

    res.json({ message: "Video berhasil dihapus" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



/* =======================================================
   DELETE ITEM
======================================================= */

router.delete("/:id", async (req, res) => {
  try {
    const [oldData] = await db
      .promise()
      .query("SELECT gambar FROM kuliner_item WHERE id=?", [req.params.id]);

    if (oldData.length && oldData[0].gambar) {
      const oldPath = "uploads/kuliner/items/" + oldData[0].gambar;

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db
      .promise()
      .query("DELETE FROM kuliner_item WHERE id=?", [req.params.id]);

    res.json({ message: "Item berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
