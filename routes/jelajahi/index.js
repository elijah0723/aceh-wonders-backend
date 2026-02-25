import express from "express";
import kategoriRoutes from "./kategori.js";
import pagesRoutes from "./pages.js";
import wisataRoutes from "./wisata.js";

const router = express.Router();

router.use("/kategori", kategoriRoutes);
router.use("/pages", pagesRoutes); // 🔥 UBAH DI SINI
router.use("/wisata", wisataRoutes);

export default router;
