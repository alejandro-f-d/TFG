import express from "express";
const router = express.Router();
import { getAllPermisos } from '../controller/permisosController.js'

router.get("/", getAllPermisos);
export default router;
