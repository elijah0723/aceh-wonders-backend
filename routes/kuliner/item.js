import express from "express";
import db from "../../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import slugify from "slugify";

const router = express.Router();

router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db
      .promise()
      .query("SELECT * FROM kuliner_item WHERE slug = ? LIMIT 1", [slug]);

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    const item = rows[0];

    // ambil video tambahan
    const [extraVideos] = await db
      .promise()
      .query("SELECT * FROM kuliner_item_video WHERE item_id=?", [item.id]);

    // 🔥 Gabungkan video utama + video tambahan
    let allVideos = [];

    if (item.vertical_video) {
      allVideos.push({
        id: "main",
        video: item.vertical_video,
      });
    }

    extraVideos.forEach((v) => {
      allVideos.push({
        id: v.id,
        video: v.video,
      });
    });

    item.videos = allVideos;

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

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

router.delete("/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    // ambil nama file dulu
    const [rows] = await db
      .promise()
      .query("SELECT video FROM kuliner_item_video WHERE id=?", [videoId]);

    if (!rows.length) {
      return res.status(404).json({ message: "Video tidak ditemukan" });
    }

    const fileName = rows[0].video;
    const filePath = "uploads/kuliner/items/video/" + fileName;

    // hapus file dari folder
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // hapus dari database
    await db
      .promise()
      .query("DELETE FROM kuliner_item_video WHERE id=?", [videoId]);

    res.json({ message: "Video berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


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

router.put("/:id/hero", upload.single("cover_image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Gambar wajib diupload" });
    }

    const [oldData] = await db
      .promise()
      .query("SELECT gambar FROM kuliner_item WHERE id=?", [req.params.id]);

    if (!oldData.length) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    // hapus gambar lama
    if (oldData[0].gambar) {
      const oldPath = "uploads/kuliner/items/" + oldData[0].gambar;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db
      .promise()
      .query("UPDATE kuliner_item SET gambar=? WHERE id=?", [
        req.file.filename,
        req.params.id,
      ]);

    res.json({ message: "Hero berhasil diupdate" });
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
    const { nama, deskripsi, content, maps_link, is_signature } = req.body;

    // Ambil data lama dulu
    const [oldData] = await db
      .promise()
      .query("SELECT * FROM kuliner_item WHERE id=?", [req.params.id]);

    if (!oldData.length) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    const oldItem = oldData[0];

    const finalNama = nama ?? oldItem.nama;
    const finalSlug = nama
      ? slugify(nama, { lower: true, strict: true })
      : oldItem.slug;

    const finalDeskripsi = deskripsi ?? oldItem.deskripsi;
    const finalContent = content ?? oldItem.content;
    const finalMaps = maps_link ?? oldItem.maps_link;
    const finalSignature =
      is_signature !== undefined ? is_signature : oldItem.is_signature;

    let finalGambar = oldItem.gambar;

    if (req.file) {
      // hapus gambar lama
      if (oldItem.gambar) {
        const oldPath = "uploads/kuliner/items/" + oldItem.gambar;
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      finalGambar = req.file.filename;
    }

    await db.promise().query(
      `
      UPDATE kuliner_item 
      SET 
        nama = ?,
        slug = ?,
        deskripsi = ?,
        content = ?,
        maps_link = ?,
        is_signature = ?,
        gambar = ?
      WHERE id = ?
      `,
      [
        finalNama,
        finalSlug,
        finalDeskripsi,
        finalContent,
        finalMaps,
        finalSignature,
        finalGambar,
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

router.post(
  "/:id/video",
  uploadVideo.single("vertical_video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Video wajib diupload" });
      }

      await db
        .promise()
        .query(
          "INSERT INTO kuliner_item_video (item_id, video) VALUES (?, ?)",
          [req.params.id, req.file.filename],
        );

      res.json({ message: "Video berhasil ditambahkan" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);


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
