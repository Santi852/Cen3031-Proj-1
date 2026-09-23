import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("API on http://localhost:3001"));