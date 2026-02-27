export const validarTipos = (schema) => {
	return (req, res, next) => {
		const dataToValidate = req.body || {};

		const { error, value } = schema.validate(dataToValidate, {
			abortEarly: false,
			stripUnknown: true,
			convert: true,
		});

		if (error) {
			const esCuerpoVacio = Object.keys(dataToValidate).length === 0;

			return res.status(400).json({
				error: esCuerpoVacio
					? "Petición mal formada."
					: "Error de validación de tipos",
				detalles: error.details.map((d) => d.message.replace(/"/g, "")),
			});
		}

		req.body = value;
		next();
	};
};
