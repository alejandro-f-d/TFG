import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3001;
const STORAGE_PATH = "/app/data/pdfs";

if (!fs.existsSync(STORAGE_PATH)) {
	// Esto en teoría no es necesario ya que al hacerse con volumenes docker se garantiza que existe salvo borrado manual.
	fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, STORAGE_PATH);
	},
	filename: (req, file, cb) => {
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

		const uuid = path.basename(
			req.file.filename,
			path.extname(req.file.filename),
		);

		res.status(201).json({
			message: "Archivo guardado correctamente",
			uuid: uuid,
			filename: req.file.filename,
			originalName: req.body.originalName || "document.pdf",
		});
	} catch (error) {
		console.error("Error en storage:", error);
		res.status(500).json({ error: "Error interno en el servidor de storage." });
	}
});

app.get("/download/:uuid", (req, res) => {
	const uuid = req.params.uuid;
	const files = fs.readdirSync(STORAGE_PATH);
	const fileName = files.find((f) => f.startsWith(uuid));

	if (fileName) {
		const filePath = path.join(STORAGE_PATH, fileName);
		res.sendFile(filePath);
	} else {
		res.status(404).json({ error: "Archivo no encontrado" });
	}
});

app.listen(PORT, () => {
	console.log(`Storage Service corriendo en puerto ${PORT}`);
	console.log(`Guardando archivos en: ${STORAGE_PATH}`);
});
