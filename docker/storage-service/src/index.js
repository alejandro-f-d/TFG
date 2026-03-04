import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3001;
const STORAGE_PATH = "/app/data/pdfs";

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, STORAGE_PATH);
	},
	filename: (req, file, cb) => {
		// Generamos un nombre único: timestamp + nombre original
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, uniqueSuffix + "-" + file.originalname);
	},
});

const upload = multer({
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB por PDF
});

app.post("/upload", upload.single("pdf"), (req, res) => {
	try {
		if (!req.file) {
			return res
				.status(400)
				.json({ error: "No se ha enviado ningún archivo." });
		}

		res.status(201).json({
			message: "Archivo guardado correctamente",
			filename: req.file.filename,
			path: req.file.path,
		});
	} catch (error) {
		res.status(500).json({ error: "Error interno en el servidor de storage." });
	}
});

app.get("/download/:filename", (req, res) => {
	const filePath = path.join(STORAGE_PATH, req.params.filename);

	if (fs.existsSync(filePath)) {
		res.sendFile(filePath);
	} else {
		res.status(404).json({ error: "Archivo no encontrado" });
	}
});

app.listen(PORT, () => {
	console.log(`Storage Service corriendo en puerto ${PORT}`);
	console.log(`Guardando archivos en: ${STORAGE_PATH}`);
});
