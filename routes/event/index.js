import express from "express";
import popularRoutes from "./popularRoutes.js";
import gridRoutes from "./gridRoutes.js";

const router = express.Router();

router.use("/popular", popularRoutes);
router.use("/grid", gridRoutes);

export default router;
