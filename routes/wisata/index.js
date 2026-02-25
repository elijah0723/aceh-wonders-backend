import express from "express";
import heroRoutes from "./heroRoutes.js";
import cardRoutes from "./cardRoutes.js";

const router = express.Router();

router.use("/hero", heroRoutes);
router.use("/cards", cardRoutes);

export default router;