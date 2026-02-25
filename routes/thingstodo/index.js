import express from "express";
import heroRoutes from "./hero.js";
import activityRoutes from "./activity.js";

const router = express.Router();

router.use("/hero", heroRoutes);
router.use("/activity", activityRoutes);

export default router;
