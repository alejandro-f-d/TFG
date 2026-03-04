import express from "express";
import { verificarToken, tienePermiso } from "../middlewares/authMiddleware.js";
import { postPeticion } from "../controller/peticionController.js";
const router = express.Router();
router.post("/", [verificarToken], postPeticion);
export default router;
