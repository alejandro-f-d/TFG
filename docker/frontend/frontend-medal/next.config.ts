const nextConfig = {
	webpackDevMiddleware: (config) => {
		config.watchOptions = {
			poll: 800,
			aggregateTimeout: 300,
		};
		return config;
	},
	hotReload: false,
};

module.exports = nextConfig;
