import express from "express";
import dotenv from "dotenv";
const router = express.Router();
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
// router.get("/", []);
export default router;
