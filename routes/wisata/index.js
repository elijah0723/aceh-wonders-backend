import express from "express";
import heroRoutes from "./heroRoutes.js";
import cardRoutes from "./cardRoutes.js";
import detailRoutes from "./detailRoutes.js";

const router = express.Router();

router.use("/hero", heroRoutes);
router.use("/cards", cardRoutes);
router.use("/pages", detailRoutes);

export default router;