import express from "express";
import homeVideoRoutes from "./homeVideoRoutes.js";

const router = express.Router();

router.use("/", homeVideoRoutes);

export default router;
