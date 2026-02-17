import express from "express";
import dotenv from "dotenv";
import { postMaquina } from '../controller/serverController.js' 
import { verificarToken, tienePermiso } from '../middlewares/authMiddleware.js';
const router = express.Router();



router.post("/", [verificarToken, tienePermiso("maq:postMaquina")],  postMaquina);
export default router;
