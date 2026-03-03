import HealthModel from "../models/healthModel.js";

export const getStatus = async (req, res) => {
	const [dbHealth, redisHealth, googleHealth] = await Promise.all([
		HealthModel.checkDB(),
		HealthModel.checkRedis(),
		HealthModel.checkGoogle(),
	]);

	const statusReport = {
		service: "api-medal",
		uptime: `${Math.floor(process.uptime())}s`,
		timestamp: new Date().toISOString(),
		components: {
			database: dbHealth,
			redis: redisHealth,
			google_api: googleHealth,
		},
	};

	//Servicios críticos
	const isSystemCriticalDown =
		dbHealth.status === "DOWN" ||
		redisHealth.status === "DOWN" ||
		googleHealth.status === "DOWN";

	if (isSystemCriticalDown) {
		return res.status(503).json({
			status: "ERROR",
			...statusReport,
		});
	}

	res.status(200).json({
		status: "OK",
		...statusReport,
	});
};
