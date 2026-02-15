import express from "express";
import dotenv from "dotenv";
import { postUser } from '../controller/userController.js' 
const router = express.Router();


router.post("/", postUser);


export default router;
