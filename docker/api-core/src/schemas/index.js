import Joi from "joi";

// --- USUARIO (Tabla 1) ---
export const usuarioSchema = Joi.object({
	nombre: Joi.string().max(50).required(),
	apellido1: Joi.string().max(50).required(),
	apellido2: Joi.string().max(50).allow(null, ""),
	correoInstitucional: Joi.string().email().max(100).required(),

	profesorResponsable: Joi.number().integer().allow(null),

	fechaIncorporacion: Joi.date().iso().required(),
	fechaFin: Joi.date().iso().min(Joi.ref("fechaIncorporacion")).allow(null),
	wifi: Joi.boolean().default(false),
	activo: Joi.boolean().default(true),
	tarjetaAcceso: Joi.string().max(20).allow(null, ""),
	teams: Joi.boolean().default(false),
	esResponsable: Joi.boolean().default(false),
	contrasena: Joi.string(),

	roles: Joi.array().items(Joi.number().integer()),
	puertasAutorizadas: Joi.array().items(Joi.number().integer()),
	duenoMaquina: Joi.array().items(Joi.number().integer()),

	usuarioVPN: Joi.string().max(50).allow(null, ""),
	gitlab: Joi.string().max(50).allow(null, ""),
});

export const loginSchema = Joi.object({
	correoInstitucional: Joi.string().email().max(100).required().messages({
		"string.empty": "El correo electrónico no puede estar vacío",
		"string.email": "El formato del correo electrónico no es válido",
		"any.required": "El correo electrónico es un campo obligatorio",
	}),

	contrasena: Joi.string().required().messages({
		"string.empty": "La contraseña no puede estar vacía",
		"any.required": "La contraseña es un campo obligatorio",
	}),
});

export const usuarioPatchSchema = usuarioSchema
	.fork(Object.keys(usuarioSchema.describe().keys), (schema) =>
		schema.optional(),
	)
	.keys({
		fotoFile: Joi.any().optional(),
	});

export const maquinaSchema = Joi.object({
	nombre: Joi.string().max(300).required(),
	caducidadSsl: Joi.date().iso().allow(null),
	certificadoSslActivo: Joi.boolean().default(false),
	emisorSsl: Joi.string().max(100).allow(null, ""),

	// Objeto Red del test
	red: Joi.object({
		direccionIpPrivadaV4: Joi.string()
			.ip({ version: ["ipv4"] })
			.required(),
		direccionIpPublicaV4: Joi.string()
			.ip({ version: ["ipv4"] })
			.allow(null, ""),
		direccionIpPrivadaV6: Joi.string()
			.ip({ version: ["ipv6"] })
			.allow(null, ""),
		direccionIpPublicaV6: Joi.string()
			.ip({ version: ["ipv6"] })
			.allow(null, ""),
		puertaEnlaceV4: Joi.string()
			.ip({ version: ["ipv4"] })
			.required(),
		puertaEnlaceV6: Joi.string()
			.ip({ version: ["ipv6"] })
			.allow(null, ""),
	}).required(),

	especificaciones: Joi.object({
		sistemaOperativo: Joi.string().max(100).required(),
		ram: Joi.number().integer().min(0).allow(null),
		esServidor: Joi.boolean().required(),
	}).required(),
});

export const maquinaPatchSchema = maquinaSchema.fork(
	Object.keys(maquinaSchema.describe().keys),
	(schema) => schema.optional(),
);

export const servicioSchema = Joi.object({
	nombreServicio: Joi.string().max(100).required(),
	descripcionTecnica: Joi.string().max(1000).allow(null, ""),
	entorno: Joi.string().max(1000).allow(null, ""),
	publico: Joi.boolean().default(false),
	softwareBase: Joi.string().max(500).allow(null, ""),
	activo: Joi.boolean().default(true),
	nivelSeveridad: Joi.string().max(50).allow(null, ""),
	idUsuario: Joi.number().integer().required(),
	idPeticion: Joi.number().integer().required(),

	servidores: Joi.array().items(Joi.number().integer()),
	puertosAbiertos: Joi.array().items(
		Joi.object({
			numeroPuertoMaquina: Joi.number().integer().required(),
			protocolo: Joi.string().max(50),
			nombreServicio: Joi.string().max(100),
			puertoVirtual: Joi.number().integer(),
		}),
	),
});

export const servicioPatchSchema = Joi.object({
	nombreServicio: Joi.string().max(100),
	descripcionTecnica: Joi.string().max(1000).allow(null, ""),
	entorno: Joi.string().max(1000).allow(null, ""),
	publico: Joi.boolean(), // no default
	softwareBase: Joi.string().max(500).allow(null, ""),
	activo: Joi.boolean(), // no default
	nivelSeveridad: Joi.string().max(50).allow(null, ""),
	idUsuario: Joi.number().integer(),
	idPeticion: Joi.number().integer(),
	servidores: Joi.array().items(Joi.number().integer()),
	puertosAbiertos: Joi.array().items(
		Joi.object({
			numeroPuertoMaquina: Joi.number().integer().required(),
			protocolo: Joi.string().max(50),
			nombreServicio: Joi.string().max(100),
			puertoVirtual: Joi.number().integer(),
		}),
	),
})
	.min(1)
	.messages({
		"object.min": "Debe enviar al menos un campo para actualizar el servicio",
	});

export const proyectoSchema = Joi.object({
	nombre: Joi.string().max(255).required().messages({
		"string.empty": "El nombre del proyecto es obligatorio",
		"any.required": "El nombre del proyecto es obligatorio",
	}),

	descripcion: Joi.string().max(1000).allow(null, "").messages({
		"string.max": "La descripción no puede superar los 1000 caracteres",
	}),

	fechaInicio: Joi.date().iso().required().messages({
		"date.format":
			"La fecha de inicio debe tener un formato ISO válido (YYYY-MM-DD)",
		"any.required": "La fecha de inicio es obligatoria",
	}),

	fechaFin: Joi.date().iso().min(Joi.ref("fechaInicio")).allow(null).messages({
		"date.min": "La fecha de fin no puede ser anterior a la fecha de inicio",
	}),

	activo: Joi.boolean().default(true),

	participantes: Joi.array()
		.items(Joi.number().integer().positive())
		.min(1)
		.messages({
			"array.min": "El proyecto debe tener al menos un participante",
			"number.base": "Los IDs de los participantes deben ser números",
		}),
});

export const proyectoPatchSchema = proyectoSchema
	.fork(Object.keys(proyectoSchema.describe().keys), (schema) =>
		schema.optional(),
	)
	.min(1);

export const rolSchema = Joi.object({
	nombre: Joi.string().max(100).required().messages({
		"string.empty": "El nombre del rol no puede estar vacío.",
		"any.required": "El nombre del rol es obligatorio.",
	}),

	descripcion: Joi.string().max(500).allow(null, "").messages({
		"string.max": "La descripción no puede superar los 500 caracteres.",
	}),

	permisos: Joi.array()
		.items(Joi.number().integer().positive())
		.min(1)
		.required()
		.messages({
			"array.base": "Los permisos deben ser una lista (array).",
			"array.min": "Debes asignar al menos un permiso al rol.",
			"any.required": "La lista de permisos es obligatoria.",
		}),
});

export const rolPatchSchema = rolSchema
	.fork(["nombre", "descripcion", "permisos"], (schema) => schema.optional())
	.min(1);

export const puertaSchema = Joi.object({
	nombre: Joi.string().max(250).trim().required().messages({
		"string.empty": "El nombre es obligatorio.",
		"string.max": "El nombre no puede exceder los 250 caracteres.",
		"any.required": "Petición mal formada.",
	}),

	ubicacion: Joi.string().max(500).trim().required().messages({
		"string.empty": "La ubicación es obligatoria.",
		"string.max": "La ubicación no puede exceder los 500 caracteres.",
		"any.required": "Petición mal formada.",
	}),
});

export const dispositivoSchema = Joi.object({
	nombre: Joi.string().max(200).trim().required().messages({
		"any.required": "Petición mal formada",
		"string.empty": "El nombre es obligatorio",
	}),

	idTipoDispositivo: Joi.number().integer().positive().required().messages({
		"any.required": "Petición mal formada",
		"number.base": "idTipoDispositivo debe ser un número",
	}),

	idMaquina: Joi.number().integer().positive().allow(null).empty("").messages({
		"number.base": "idMaquina debe ser un número",
	}),

	puntoMontaje: Joi.string().max(100).trim().allow(null, ""),

	capacidad: Joi.number().integer().min(0).allow(null),

	capacidadUsada: Joi.number().integer().min(0).allow(null),

	tecnologia: Joi.string().max(200).trim().allow(null, ""),
});

export const dispositivoPatchSchema = Joi.object({
	// Todos son opcionales (.optional()), pero si vienen, deben cumplir la regla
	nombre: Joi.string().max(200).trim().messages({
		"string.max": "El nombre no puede exceder los 200 caracteres",
	}),

	idTipoDispositivo: Joi.number().integer().positive().messages({
		"number.base": "idTipoDispositivo debe ser un número",
	}),

	idMaquina: Joi.number()
		.integer()
		.positive()
		.allow(null)
		.empty("") // Si llega cadena vacía, lo trata como null/undefined
		.messages({
			"number.base": "idMaquina debe ser un número",
		}),

	puntoMontaje: Joi.string().max(100).trim().allow(null, ""),

	capacidad: Joi.number().integer().min(0).allow(null),

	capacidadUsada: Joi.number().integer().min(0).allow(null),

	tecnologia: Joi.string().max(200).trim().allow(null, ""),
})
	.min(1)
	.messages({
		"object.min": "Debe enviar al menos un campo para actualizar",
	});

export const reservaSchema = Joi.object({
	nombre: Joi.string().min(3).max(100).required().messages({
		"string.empty": "El nombre de la reserva es obligatorio.",
		"string.min": "El nombre debe tener al menos 3 caracteres.",
	}),
	descripcion: Joi.string().max(500).allow("", null),
	fechaInicio: Joi.date().iso().required().messages({
		"date.format": "La fecha de inicio debe ser un formato ISO válido.",
	}),
	fechaFin: Joi.date().iso().min(Joi.ref("fechaInicio")).required().messages({
		"date.min": "La fecha de fin no puede ser anterior a la de inicio.",
	}),
});

export const patchReservaBodySchema = Joi.object({
	nombre: Joi.string().min(3).max(100).trim().messages({
		"string.min": "El nombre de la reserva debe tener al menos 3 caracteres.",
		"string.max":
			"El nombre de la reserva no puede exceder los 100 caracteres.",
	}),

	descripcion: Joi.string().max(500).allow("", null).trim().messages({
		"string.max": "La descripción no puede exceder los 500 caracteres.",
	}),

	fechaInicio: Joi.date().iso().messages({
		"date.format": "La fecha de inicio debe tener un formato ISO válido.",
	}),

	fechaFin: Joi.date().iso().greater(Joi.ref("fechainicio")).messages({
		"date.format": "La fecha de fin debe tener un formato ISO válido.",
		"date.greater": "La fecha de fin debe ser posterior a la fecha de inicio.",
	}),
})
	.min(1)
	.messages({
		"object.min": "Debes proporcionar al menos un campo para actualizar.",
	});

export const patchReservaParamsSchema = Joi.object({
	uuid: Joi.string()
		.guid({ version: ["uuidv4"] })
		.required()
		.messages({
			"string.guid": "El identificador de la reserva debe ser un UUID válido.",
			"any.required": "El UUID de la reserva es obligatorio.",
		}),
});

export const peticionSchema = Joi.object({
	nombreProyectoAsociado: Joi.string().required().messages({
		"any.required": "El nombre del proyecto asociado es obligatorio ",
	}),
	servidorAsociado: Joi.array().items(Joi.number().integer()).min(1).required(),
	necesidadServidor: Joi.string().required(),
	tareasServidor: Joi.string().required(),

	cpuSolicitada: Joi.string().required(),
	gpuSolicitada: Joi.string().allow("", null).default("No GPU"),
	ram: Joi.string().required(),
	disco: Joi.string().required(),

	prioridadTarea: Joi.number().integer().required().messages({
		"any.required": "La prioridad es obligatoria",
	}),
	momentoEjecucion: Joi.number().integer().required().messages({
		"any.required": "El momento de ejecución es obligatorio",
	}),

	docker: Joi.string().required(),
	sistemaOperativo: Joi.string().required(),
	tiempoEstimadoTarea: Joi.string().required(),

	nombreServicioAsociado: Joi.string().allow("", null),
	nombreAccesoNativo: Joi.string().allow("", null),
	justificacionAccesoNativo: Joi.string().allow("", null),
	comentariosAdicionales: Joi.string().allow("", null),
	fechaFin: Joi.date().iso(),
});
