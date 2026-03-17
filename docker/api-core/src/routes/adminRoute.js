import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { serverAdapter } from "../controller/adminController.js";

const router = express.Router();

// Aplicamos los middlewares a TODO el router del dashboard
router.use(
	"/",
	verificarToken,
	tienePermiso("admin:total"),
	serverAdapter.getRouter(),
);

export default router;
