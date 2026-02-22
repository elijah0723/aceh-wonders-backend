import express from "express";
import kategoriRoutes from "./kategori.js";
import itemRoutes from "./item.js"
import pagesRoutes from "./pages.js"

const router = express.Router();

router.use("/kategori", kategoriRoutes);
router.use("/item", itemRoutes);
router.use("/pages", pagesRoutes);

export default router;
