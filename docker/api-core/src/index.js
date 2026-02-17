import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import userRoute from './routes/userRoute.js';
import healthCheckRoute from './routes/healthCheckRoute.js';
import permisosRoute from './routes/permisosRoute.js';
import serverRoute from './routes/serverRoute.js'; 
import swaggerJsdoc from 'swagger-jsdoc'; 
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
app.set('trust proxy', true); // Al venir de un docker es necesario para poder extraer la ip de la que se realiza la petición. 

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Medal',
      version: '1.0.0',
    },
    servers: [{ url: `${process.env.API_DIRECTION}` }],
  },
  apis: ['./src/routes/*.js'],
};


const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middlewares 
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    swaggerOptions: {
      supportedSubmitMethods: [], // Desactiva Try it Out
    },
    explorer: false, 
  })
);
app.use(cors());
app.use(express.json()); 

// Endpoints
app.use('/api/user', userRoute);
app.use('/api/healthcheck', healthCheckRoute);
app.use('/api/permisos', permisosRoute); // Para poder hacer un get de todos los permisos y poder mostrarlos en pantalla.
app.use('/api/maquina', serverRoute);

// Errores interno 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Algo salió mal en el servidor' });
});


app.listen(process.env.PORT, () => {
  console.log(`API Medal corriendo en ${process.env.API_DIRECTION}`);
  console.log(`Documentación disponible en ${process.env.API_DIRECTION}/api-docs`);
  console.log(`HealthCheck de la aplicación disponible en ${process.env.API_DIRECTION}/api/healthCheck`)
});
