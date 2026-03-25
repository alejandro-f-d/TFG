import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { verificarToken, tienePermiso } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
app.set("trust proxy", true); // Al venir de un docker es necesario para poder extraer la ip de la que se realiza la petición.

const swaggerOptions = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "API Medal",
			version: "1.0.0",
		},
		servers: [{ url: `${process.env.API_DIRECTION}` }],
	},
	apis: ["./src/routes/*.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middlewares
app.use(
	"/api-docs",
	[verificarToken, tienePermiso("swagger:viewDocs")],
	swaggerUi.serve,
	swaggerUi.setup(swaggerDocs, {
		swaggerOptions: {
			supportedSubmitMethods: [], // Desactiva Try it Out
		},
		explorer: false,
	}),
);
// app.use(cors());
app.use(express.json());

// Endpoints
app.use("/api/user", userRoute);
app.use("/api/healthcheck", healthCheckRoute);
app.use("/api/permisos", permisosRoute); // Para poder hacer un get de todos los permisos y poder mostrarlos en pantalla.
app.use("/api/maquina", serverRoute);
app.use("/api/servicios", serviciosRoute); // Para poder hacer un get de todos los servicios en todos los servidores.
app.use("/api/proyectosgitlab", proyectosGitlabRoute);
app.use("/api/rol", rolRoute);
app.use("/api/puertas", puertasRoute);
app.use("/api/dispositivos", dispositivosRoute);
app.use("/api/reservas", calendarioRoute);
app.use("/api/peticion", peticionRoute);
app.use("/api/monitor", monitorRoute);
app.use("/admin/queues", adminRoute);

// Errores interno 500
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send({ error: "Algo salió mal en el servidor" });
});

app.listen("8080", "0.0.0.0", () => {
	console.log(`API Medal corriendo en ${process.env.API_DIRECTION}`);
	console.log(
		`Documentación disponible en ${process.env.API_DIRECTION}/api-docs`,
	);
	console.log(
		`HealthCheck de la aplicación disponible en ${process.env.API_DIRECTION}/api/healthCheck`,
	);
});
