import express from "express";
import dotenv from "dotenv";
const router = express.Router();

import {getServicios} from '../controller/serviciosController.js';
import { verificarToken, tienePermiso } from '../middlewares/authMiddleware.js';


router.get("/", [verificarToken, tienePermiso('servicios:getAll')], getServicios);

export default router;

