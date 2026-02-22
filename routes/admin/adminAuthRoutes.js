import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../config/db.js";

import multer from "multer";
import path from "path";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "aceh_wonders_secret";


/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/admin"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

/* ================= LOGIN ================= */

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email & Password wajib diisi" });
  }

  db.query(
    "SELECT * FROM admins WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }

      if (rows.length === 0) {
        return res.status(401).json({ message: "Admin tidak ditemukan" });
      }

      const admin = rows[0];

      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Password salah" });
      }

      const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          avatar: admin.avatar,
        },
      });
    },
  );
});

/* ================= PROFILE ================= */

router.get("/profile", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    db.query(
      "SELECT id, name, email, avatar FROM admins WHERE id = ?",
      [decoded.id],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Server error" });
        }

        if (rows.length === 0) {
          return res.status(404).json({ message: "Admin tidak ditemukan" });
        }

        res.json(rows[0]);
      },
    );
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
});

/* ================= UPDATE PROFILE ================= */

router.put(
  "/profile",
  upload.single("avatar"),
  (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const { name } = req.body;
      const avatar = req.file
        ? `/uploads/admin/${req.file.filename}`
        : null;

      const query = avatar
        ? "UPDATE admins SET name=?, avatar=? WHERE id=?"
        : "UPDATE admins SET name=? WHERE id=?";

      const params = avatar
        ? [name, avatar, decoded.id]
        : [name, decoded.id];

      db.query(query, params, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Gagal update profile" });
        }

        res.json({ message: "Profile updated" });
      });
    } catch (err) {
      return res.status(401).json({ message: "Token tidak valid" });
    }
  }
);


/* ================= CHANGE PASSWORD ================= */

router.put("/change-password", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Field tidak lengkap" });
    }

    db.query(
      "SELECT * FROM admins WHERE id=?",
      [decoded.id],
      async (err, rows) => {
        if (err) return res.status(500).json({ message: "Server error" });

        const admin = rows[0];

        const isMatch = await bcrypt.compare(
          currentPassword,
          admin.password
        );

        if (!isMatch) {
          return res
            .status(401)
            .json({ message: "Password lama salah" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        db.query(
          "UPDATE admins SET password=? WHERE id=?",
          [hashed, decoded.id],
          (err) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Gagal update password" });

            res.json({ message: "Password berhasil diganti" });
          }
        );
      }
    );
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
});


export default router;
