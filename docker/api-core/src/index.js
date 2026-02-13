import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import userRoute from './routes/userRoute.js';
import healthCheckRoute from './routes/healthCheckRoute.js'

dotenv.config();

const app = express();
const PORT = 8080; 

// Middlewares 
app.use(cors());
app.use(express.json()); 

// Endpoints
app.use('/user', userRoute);
app.use('/healthcheck', healthCheckRoute);

// Errores interno 500
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Algo salió mal en el servidor' });
});


app.listen(PORT, () => {
    console.log(`API Medal corriendo en http://localhost:${PORT}`);
});
