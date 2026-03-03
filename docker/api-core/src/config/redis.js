import IORedis from "ioredis";

export const redisConnection = new IORedis(process.env.REDIS_URL, {
	maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) =>
	console.error("Redis Connection Error:", err),
);
