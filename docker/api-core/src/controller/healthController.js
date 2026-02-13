import HealthModel from '../models/healthModel.js';

export const getStatus = async (req, res) => {
  const dbHealth = await HealthModel.checkDB();
  const statusReport = {
    service: 'api-medal',
    uptime: process.uptime(), 
    database: dbHealth,
    timestamp: new Date().toISOString()
  };
  if (dbHealth.status === 'UP') {
    return res.status(200).json(statusReport);
  } else {
    return res.status(503).json(statusReport);
  }
};
