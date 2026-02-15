// import BaseDeDatos from './conexion.js';
import BaseDeDatos from '../bbdd/conexion.js'; // Tu configuración de conexión a la DB

class HealthModel {
  static async checkDB() {
    try {
      const startTime = Date.now();
      await BaseDeDatos.query('SELECT 1');
      const duration = Date.now() - startTime;

      return {
        status: 'UP',
        latency: `${duration}ms`,
        connection: 'PostgreSQL OK'
      };
    } catch (error) {
      return {
        status: 'DOWN',
        error: error.message,
        connection: 'PostgreSQL Failed'
      };
    }
  }
}

export default HealthModel;
