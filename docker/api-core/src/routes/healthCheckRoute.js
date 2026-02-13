import express from "express";
import dotenv from "dotenv";
import { getStatus } from "../controller/healthController.js"


const router = express.Router();

// Get para el healthCheck:
router.get("/", getStatus);
export default router;
