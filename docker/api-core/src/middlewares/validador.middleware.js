export const validarTipos = (schema) => {
	return (req, res, next) => {
		const dataToValidate = {
			...req.body,
			...req.params,
			...req.query,
			...(req.file ? { file: req.file } : {}),
			...(req.files ? { files: req.files } : {}),
		};

		const { error, value } = schema.validate(dataToValidate, {
			abortEarly: false,
			stripUnknown: true, // Esto es clave para limpiar el objeto
			convert: true,
		});

		if (error) {
			return res.status(400).json({
				error: "Error de validación de tipos",
				detalles: error.details.map((d) => d.message.replace(/"/g, "")),
			});
		}

		// Importante: No machaques req.body con todo, mantén la separación
		next();
	};
};
