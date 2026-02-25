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

// --- MAQUINA (Tabla 2) ---
export const maquinaSchema = Joi.object({
    nombre: Joi.string().max(300).required(),
    caducidadSSL: Joi.date().iso().allow(null),
    certificadoSslActivo: Joi.boolean().default(false),
    emisorSsl: Joi.string().max(100).allow(null, ''),
    direccionIpPrivadaV4: Joi.string().ip({ version: ['ipv4'] }).max(15).required(),
    direccionIpPublicaV4: Joi.string().ip({ version: ['ipv4'] }).max(15).allow(null, ''),
    direccionIpPrivadaV6: Joi.string().ip({ version: ['ipv6'] }).max(39).allow(null, ''),
    puertaEnlaceV4: Joi.string().ip({ version: ['ipv4'] }).max(15).required(),
    ram: Joi.number().integer().allow(null),
    sistemaOperativo: Joi.string().max(100).required(),
    esServidor: Joi.boolean().default(false)
});

// --- PROYECTOS GITLAB (Tabla 7) ---
export const proyectoGitlabSchema = Joi.object({
    nombre: Joi.string().max(50).required(),
    descripcion: Joi.string().max(500).allow(null, ''),
    fechaInicio: Joi.date().iso().default(() => new Date()),
    fechaFin: Joi.date().iso().min(Joi.ref('fechaInicio')).allow(null),
    activo: Joi.boolean().default(true),
    participantes: Joi.array().items(Joi.number().integer()).unique() // Para la tabla Participa
});

// --- MONITOREO WEB (Tabla 14) ---
export const monitoreoWebSchema = Joi.object({
    nombreObjetivo: Joi.string().max(50).required(),
    direccion: Joi.string().max(100).required(),
    valorEsperado: Joi.number().integer().allow(null),
    timeoutMs: Joi.number().integer().default(500),
    umbralReintentos: Joi.number().integer().default(5),
    intervaloSegundos: Joi.number().integer().default(60),
    idUsuario: Joi.number().integer().required(),
    idMetodo: Joi.number().integer().required()
});

// --- DETALLE PETICIÓN ACCESO (Tabla 22) ---
export const detallePeticionAccesoSchema = Joi.object({
    cpuSolicitada: Joi.number().integer().required(),
    gpuSolicitada: Joi.number().integer().required(),
    nombreProyectoAsociado: Joi.string().max(50).required(),
    nombreServicioAsociado: Joi.string().max(100).required(),
    prioridadTarea: Joi.number().integer().required(),
    docker: Joi.string().max(50).allow(null, ''),
    sistemaOperativo: Joi.string().max(100).allow(null, ''),
    comentariosAdicionales: Joi.string().max(500).allow(null, ''),
    tiempoEstimadoTarea: Joi.number().integer().allow(null),
    aceptaTos: Joi.boolean().default(true),
    disco: Joi.number().integer().required(),
    ram: Joi.number().integer().required(),
    idPeticionReferencia: Joi.number().integer().required(),
    idMomentoEjecucion: Joi.number().integer().required()
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
