import express from "express";
import dotenv from "dotenv";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postProyectoGitlab } from "../controller/proyectosGitlabController.js";

const router = express.Router();

router.post(
	"/",
	[verificarToken, tienePermiso("gitlab:postProyecto")],
	postProyectoGitlab,
);

export default router;
