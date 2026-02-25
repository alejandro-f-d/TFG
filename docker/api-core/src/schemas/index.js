import Joi from 'joi';

// --- USUARIO (Tabla 1) ---
export const usuarioSchema = Joi.object({
    nombre: Joi.string().max(50).required(),
    apellido1: Joi.string().max(50).required(),
    apellido2: Joi.string().max(50).allow(null, ''),
    correoInstitucional: Joi.string().email().max(100).required(),
    
    profesorResponsable: Joi.number().integer().allow(null), 
    
    fechaIncorporacion: Joi.date().iso().required(),
    fechaFin: Joi.date().iso().min(Joi.ref('fechaIncorporacion')).allow(null),
    wifi: Joi.boolean().default(false),
    activo: Joi.boolean().default(true),
    tarjetaAcceso: Joi.string().max(20).allow(null, ''),
    teams: Joi.boolean().default(false),
    jefeLaboratorio: Joi.boolean().default(false),
    esResponsable: Joi.boolean().default(false),
    contrasena: Joi.string().required(), // El test envía "test", así que debe ser requerido
    
    roles: Joi.array().items(Joi.number().integer()),
    puertasAutorizadas: Joi.array().items(Joi.number().integer()),
    duenoMaquina: Joi.array().items(Joi.number().integer()),

    usuarioVPN: Joi.string().max(50).allow(null, ''),
    gitlab: Joi.string().max(50).allow(null, '')
});


export const loginSchema = Joi.object({
    // Validamos que sea un string, formato email válido y obligatorio
    correoInstitucional: Joi.string()
        .email()
        .max(100)
        .required()
        .messages({
            'string.empty': 'El correo electrónico no puede estar vacío',
            'string.email': 'El formato del correo electrónico no es válido',
            'any.required': 'El correo electrónico es un campo obligatorio'
        }),

    contrasena: Joi.string()
        .required()
        .messages({
            'string.empty': 'La contraseña no puede estar vacía',
            'any.required': 'La contraseña es un campo obligatorio'
        })
});

export const usuarioPatchSchema = usuarioSchema.fork(
    Object.keys(usuarioSchema.describe().keys),
    (schema) => schema.optional()
);

export const maquinaSchema = Joi.object({
    nombre: Joi.string().max(300).required(),
    caducidadSsl: Joi.date().iso().allow(null), // Ojo: tu test usa Ssl con 'l' minúscula
    certificadoSslActivo: Joi.boolean().default(false),
    emisorSsl: Joi.string().max(100).allow(null, ''),
    
    // Objeto Red del test
    red: Joi.object({
        direccionIpPrivadaV4: Joi.string().ip({ version: ['ipv4'] }).required(),
        direccionIpPublicaV4: Joi.string().ip({ version: ['ipv4'] }).allow(null, ''),
        direccionIpPrivadaV6: Joi.string().ip({ version: ['ipv6'] }).allow(null, ''),
        direccionIpPublicaV6: Joi.string().ip({ version: ['ipv6'] }).allow(null, ''),
        puertaEnlaceV4: Joi.string().ip({ version: ['ipv4'] }).required(),
        puertaEnlaceV6: Joi.string().ip({ version: ['ipv6'] }).allow(null, '')
    }).required(),

    // Objeto Especificaciones del test
    especificaciones: Joi.object({
        sistemaOperativo: Joi.string().max(100).required(),
        ram: Joi.number().integer().min(0).allow(null),
        esServidor: Joi.boolean().required()
    }).required()
});

export const maquinaPatchSchema = maquinaSchema.fork(
    Object.keys(maquinaSchema.describe().keys),
    (schema) => schema.optional()
);


export const servicioSchema = Joi.object({
    nombreServicio: Joi.string().max(100).required(),
    descripcionTecnica: Joi.string().max(1000).allow(null, ''),
    entorno: Joi.string().max(1000).allow(null, ''),
    publico: Joi.boolean().default(false),
    softwareBase: Joi.string().max(500).allow(null, ''),
    activo: Joi.boolean().default(true),
    nivelSeveridad: Joi.string().max(50).allow(null, ''),
    idUsuario: Joi.number().integer().required(),
    idPeticion: Joi.number().integer().required(),
    
    servidores: Joi.array().items(Joi.number().integer()),
    puertosAbiertos: Joi.array().items(Joi.object({
        numeroPuertoMaquina: Joi.number().integer().required(),
        protocolo: Joi.string().max(50),
        nombreServicio: Joi.string().max(100),
        puertoVirtual: Joi.number().integer()
    }))
});

export const servicioPatchSchema = Joi.object({
    nombreServicio: Joi.string().max(100),
    descripcionTecnica: Joi.string().max(1000).allow(null, ''),
    entorno: Joi.string().max(1000).allow(null, ''),
    publico: Joi.boolean(),  // no default
    softwareBase: Joi.string().max(500).allow(null, ''),
    activo: Joi.boolean(),   // no default
    nivelSeveridad: Joi.string().max(50).allow(null, ''),
    idUsuario: Joi.number().integer(),
    idPeticion: Joi.number().integer(),
    servidores: Joi.array().items(Joi.number().integer()),
    puertosAbiertos: Joi.array().items(Joi.object({
        numeroPuertoMaquina: Joi.number().integer().required(),
        protocolo: Joi.string().max(50),
        nombreServicio: Joi.string().max(100),
        puertoVirtual: Joi.number().integer()
    }))
}).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar el servicio'
});
