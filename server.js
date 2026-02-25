import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import db from "./config/db.js";
import uploadRoutes from "./routes/upload.js";

import heroRoutes from "./routes/hero/index.js"

import homeRoutes from "./routes/home/index.js";
import wisataRoutes from "./routes/wisata/index.js";
import jelajahiRoutes from "./routes/jelajahi/index.js";
import kulinerRoutes from "./routes/kuliner/index.js"
import eventRoutes from "./routes/event/index.js"
import adminRoutes from "./routes/admin/index.js"
import thingsToDoRoutes from "./routes/thingstodo/index.js";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//hero routes
app.use("/hero", heroRoutes)

// routes
app.use("/admin", adminRoutes)
app.use("/home", homeRoutes);
app.use("/jelajahi", jelajahiRoutes);
app.use("/wisata", wisataRoutes);
app.use("/kuliner", kulinerRoutes);
app.use("/event", eventRoutes);

app.use("/things-to-do", thingsToDoRoutes);

// database
db.connect((err) => {
  if (err) console.error("❌ DB connection error:", err);
  else console.log("✅ Database connected!");
});


app.get("/", (req, res) => res.send("Server is running!"));

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
