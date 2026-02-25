import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postRole } from "../controller/rolController.js"

const router = express.Router();

router.post("/", [verificarToken, tienePermiso("roles:postRoles")], postRole);
export default router;

