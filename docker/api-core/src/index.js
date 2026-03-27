import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Imports de rutas
import userRoute from "./routes/userRoute.js";
import healthCheckRoute from "./routes/healthCheckRoute.js";
import permisosRoute from "./routes/permisosRoute.js";
import serverRoute from "./routes/serverRoute.js";
import serviciosRoute from "./routes/serviciosRoute.js";
import proyectosGitlabRoute from "./routes/proyectosGitlabRoute.js";
import rolRoute from "./routes/rolRoute.js";
import puertasRoute from "./routes/puertasRoute.js";
import dispositivosRoute from "./routes/dispositivosRoute.js";
import calendarioRoute from "./routes/calendarioRoute.js";
import peticionRoute from "./routes/peticionRoute.js";
import monitorRoute from "./routes/monitorRoute.js";
import adminRoute from "./routes/adminRoute.js";

// Swagger y Auth
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { verificarToken, tienePermiso } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuración necesaria para proxies (Nginx/Docker)
app.set("trust proxy", true);

// --- 1. MIDDLEWARES DE PARSEO (Deben ir primero) ---
app.use(express.json());
app.use(cookieParser());

// --- 2. CONFIGURACIÓN DE SWAGGER ---
const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "API Medal",
			version: "1.0.0",
			description: "Documentación de API Medal con acceso por Cookie/Header",
		},
		servers: [{ url: `${process.env.API_DIRECTION}` }],
	},
	// Usamos path.join para evitar el error ENOENT en contenedores
	apis: [path.join(__dirname, "./routes/*.js")],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// --- 3. RUTA DE SWAGGER PROTEGIDA ---
app.use(
	"/api-docs",
	[verificarToken, tienePermiso("swagger:viewDocs")],
	swaggerUi.serve,
	swaggerUi.setup(swaggerDocs, {
		swaggerOptions: {
			supportedSubmitMethods: [], // Desactiva Try it Out
			persistAuthorization: true,
		},
		explorer: false,
	}),
);

// --- 4. ENDPOINTS ---
app.use("/api/user", userRoute);
app.use("/api/healthcheck", healthCheckRoute);
app.use("/api/permisos", permisosRoute);
app.use("/api/maquina", serverRoute);
app.use("/api/servicios", serviciosRoute);
app.use("/api/proyectosgitlab", proyectosGitlabRoute);
app.use("/api/rol", rolRoute);
app.use("/api/puertas", puertasRoute);
app.use("/api/dispositivos", dispositivosRoute);
app.use("/api/reservas", calendarioRoute);
app.use("/api/peticion", peticionRoute);
app.use("/api/monitor", monitorRoute);
app.use("/admin/queues", adminRoute);

// Manejo de errores 500
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send({ error: "Algo salió mal en el servidor" });
});

// Inicio del servidor
const PORT = 8080;
app.listen(PORT, "0.0.0.0", () => {
	console.log(` API Medal corriendo en ${process.env.API_DIRECTION}`);
	console.log(` Documentación: ${process.env.API_DIRECTION}/api-docs`);
});
