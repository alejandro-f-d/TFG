import pkg from "pg";
const { Pool } = pkg;

class BaseDeDatos {
	static pool = null;

	static establecerConexion() {
		if (this.pool) return this.pool;

		this.pool = new Pool({
			connectionString: process.env.DB_URL,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		console.log("Pool de conexiones PostgreSQL configurado");
		return this.pool;
	}

	static async query(text, params) {
		const pool = this.establecerConexion();
		return pool.query(text, params);
	}

	static async cerrarConexion() {
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
			console.log("Pool de conexiones cerrado");
		}
	}
	static async connect() {
		const pool = this.establecerConexion();
		return pool.connect();
	}
}

export default BaseDeDatos;
