import express from "express";
import db from "../../config/db.js";

const router = express.Router();

router.get("/summary", (req, res) => {
  db.query("SELECT COUNT(*) as total FROM wisata", (err, wisataResult) => {
    if (err) {
      console.error("Wisata error:", err);
      return res.status(500).json({ message: err.message });
    }

    db.query(
      "SELECT COUNT(*) as total FROM kuliner_item",
      (err, kulinerResult) => {
        if (err) {
          console.error("Kuliner error:", err);
          return res.status(500).json({ message: err.message });
        }

        db.query(
          "SELECT COUNT(*) as total FROM grid_events",
          (err, eventResult) => {
            if (err) {
              console.error("Event error:", err);
              return res.status(500).json({ message: err.message });
            }

            res.json({
              totalWisata: wisataResult[0].total,
              totalKuliner: kulinerResult[0].total,
              totalEvent: eventResult[0].total,
            });
          },
        );
      },
    );
  });
});

export default router;
