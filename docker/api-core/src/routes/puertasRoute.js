import express from "express";
import dotenv from "dotenv";

import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
const router = express.Router();

import { postPuerta } from "../controller/puertasController.js";
import { validarTipos } from "../middlewares/validador.middleware.js";
import { puertaSchema } from "../schemas/index.js";

router.post(
	"/",
	[
		verificarToken,
		tienePermiso("puertas:postPuerta"),
		validarTipos(puertaSchema),
	],
	postPuerta,
);

export default router;
