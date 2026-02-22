import express from "express";
import adminAuthRoutes from "./adminAuthRoutes.js";
import dashboardRoutes from "./dashboard.js";

const router = express.Router();

router.use("/auth", adminAuthRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
