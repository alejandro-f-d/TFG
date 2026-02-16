import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import userRoute from './routes/userRoute.js';
import healthCheckRoute from './routes/healthCheckRoute.js'
import swaggerJsdoc from 'swagger-jsdoc'; 
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();
const PORT = 8080; 

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Medal',
      version: '1.0.0',
    },
    servers: [{ url: `${process.env.API_DIRECTION}:${PORT}` }],
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

// Errores interno 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Algo salió mal en el servidor' });
});


app.listen(PORT, () => {
  console.log(`API Medal corriendo en http://${process.env.API_DIRECTION}:${PORT}`);
  console.log(`Documentación disponible en http://${process.env.API_DIRECTION}:${PORT}/api-docs`);
  console.log(`HealthCheck de la aplicación disponible en http://${process.env.API_DIRECTION}:${PORT}/api/healthCheck`)
});
