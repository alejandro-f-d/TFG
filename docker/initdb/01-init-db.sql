CREATE SCHEMA IF NOT EXISTS medal;

-- 1. USUARIO 
CREATE TABLE IF NOT EXISTS medal.usuario (
  idUsuario SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL, 
  apellido1 VARCHAR(50) NOT NULL,
  apellido2 VARCHAR(50), 
  teams BOOLEAN DEFAULT FALSE,
  esResponsable BOOLEAN DEFAULT FALSE,
  usuarioVPN VARCHAR(50),  
  correoInstitucional VARCHAR(100) NOT NULL UNIQUE 
    CONSTRAINT check_correo CHECK (correoInstitucional LIKE '%@%'), 
    
  activo BOOLEAN DEFAULT TRUE, 
  fechaIncorporacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fechaFin DATE,
  wifi BOOLEAN DEFAULT FALSE,
  tarjetaAcceso VARCHAR(20), 
  dirIpLastLogin VARCHAR(39),
  uuidUsuario UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), 
  contrasena VARCHAR(1000) NOT NULL,
  gitlab VARCHAR(50) UNIQUE, 
  responsable INTEGER,
  jefeLaboratorio BOOLEAN DEFAULT false,
  CONSTRAINT fk_responsable_usuario 
    FOREIGN KEY (responsable) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE SET NULL,
  CONSTRAINT check_no_auto_responsable 
    CHECK (responsable <> idUsuario),
  CONSTRAINT check_fechas 
    CHECK (fechaFin IS NULL OR fechaFin >= fechaIncorporacion)
);

-- 2. Maquina
CREATE TABLE IF NOT EXISTS medal.maquina(
  idMaquina SERIAL PRIMARY KEY, 
  nombre VARCHAR(50) NOT NULL UNIQUE,
  caducidadSSL DATE,
  certificadoSslActivo BOOLEAN DEFAULT FALSE,
  emisorSsl VARCHAR(100),
  direccionIpPrivadaV4 VARCHAR(15) NOT NULL,
  uuidMaquina UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), 
  direccionIpPublicaV4 VARCHAR(15),
  direccionIpPrivadaV6 VARCHAR(39),
  direccionIpPublicaV6 VARCHAR(39),
  puertaEnlaceV4 VARCHAR(15) NOT NULL,
  puertaEnlaceV6 VARCHAR(39),
  ram INTEGER,
  sistemaOperativo VARCHAR(100) NOT NULL
);


-- 4. TIPODISPOSITIVO
CREATE TABLE IF NOT EXISTS medal.tipoDispositivo(
  idTipoDispositivo SERIAL PRIMARY KEY,
  nombre VARCHAR(50),
  descripcion VARCHAR(1000)
);

-- 3. DISPOSITIVOS
CREATE TABLE IF NOT EXISTS medal.dispositivos(
  idDispositivo SERIAL PRIMARY KEY,
  puntoMontaje VARCHAR(100),
  capacidad INTEGER, 
  capacidadUsada INTEGER, 
  tecnologia VARCHAR(200),
  uuidDispositivo UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  idMaquina INTEGER NOT NULL,
  CONSTRAINT fk_pertenece_Maquina 
    FOREIGN KEY (idMaquina)
    REFERENCES medal.Maquina(idMaquina)
    ON DELETE CASCADE,
  idTipoDispositivo INTEGER NOT NULL,
  CONSTRAINT fk_tipo_dispositivo
    FOREIGN KEY (idTipoDispositivo)
    REFERENCES medal.tipoDispositivo(idTipoDispositivo)
    ON DELETE CASCADE 
);



-- 7. PROYECTOS GITLAB
CREATE TABLE IF NOT EXISTS medal.proyectosGitlab(
  idProyecto SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL, 
  descripcion VARCHAR(500),
  uuidProyecto UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fechaInicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fechaFin DATE,
  activo BOOLEAN DEFAULT TRUE
);

-- 8. PARTICIPA
CREATE TABLE IF NOT EXISTS medal.participa (
    idUsuario INTEGER NOT NULL,
    idProyecto INTEGER NOT NULL,
    PRIMARY KEY (idUsuario, idProyecto),
    CONSTRAINT fk_participa_usuario
        FOREIGN KEY (idUsuario)
        REFERENCES medal.usuario(idUsuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_participa_proyecto
        FOREIGN KEY (idProyecto)
        REFERENCES medal.proyectosGitlab(idProyecto)
        ON DELETE CASCADE
);

-- 9. ROLES 
CREATE TABLE IF NOT EXISTS medal.roles(
  idRole SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  uuidRole UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), 
  fechaCreacion DATE NOT NULL DEFAULT CURRENT_DATE,
  idUsuario INTEGER NOT NULL, 
  CONSTRAINT fk_usuario_creador 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario)
);

-- 10. ROLES TIENE
CREATE TABLE IF NOT EXISTS medal.rolesTiene (
    idRole INTEGER NOT NULL,
    idUsuario INTEGER NOT NULL,
    PRIMARY KEY (idRole, idUsuario),
    CONSTRAINT fk_rolesTiene_role
        FOREIGN KEY (idRole)
        REFERENCES medal.roles(idRole)
        ON DELETE CASCADE,
    CONSTRAINT fk_rolesTiene_usuario
        FOREIGN KEY (idUsuario)
        REFERENCES medal.usuario(idUsuario)
        ON DELETE CASCADE
);

-- 11. PERMISOS
CREATE TABLE IF NOT EXISTS medal.permisos(
  idPermiso SERIAL PRIMARY KEY,
  alias VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(500),
  modulo VARCHAR(30) NOT NULL, 
  uuidPermiso UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
);

-- 12. OPERA CON
CREATE TABLE IF NOT EXISTS medal.operaCon (
    idRole INTEGER NOT NULL,
    idPermiso INTEGER NOT NULL,
    PRIMARY KEY (idRole, idPermiso),
    CONSTRAINT fk_operaCon_role
        FOREIGN KEY (idRole)
        REFERENCES medal.roles(idRole)
        ON DELETE CASCADE,
    CONSTRAINT fk_operaCon_permiso
        FOREIGN KEY (idPermiso)
        REFERENCES medal.permisos(idPermiso)
        ON DELETE CASCADE
);

-- 13. METODO MONITOREO
CREATE TABLE IF NOT EXISTS medal.metodoMonitoreoWeb(
  idMetodo SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL, 
  alias VARCHAR(50) NOT NULL,
  descripcion VARCHAR(500)
);

-- 14. MONITOREO WEB
CREATE TABLE IF NOT EXISTS medal.monitoreoWeb (
    idMonitor SERIAL PRIMARY KEY,
    fechaVerificacion TIMESTAMPTZ, 
    nombreObjetivo VARCHAR(50) NOT NULL,
    direccion VARCHAR(100) NOT NULL,
    valorUltimaRespuesta INTEGER,
    valorEsperado INTEGER,
    uuidMonitoreo UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    fechaCreacion DATE NOT NULL DEFAULT CURRENT_DATE,
    timeoutMs INTEGER DEFAULT 500,
    umbralReintentos INTEGER DEFAULT 5,
    intervaloSegundos INTEGER DEFAULT 60,
    contadorFallos INTEGER DEFAULT 0,
    
    idUsuario INTEGER NOT NULL,
    idMetodo INTEGER NOT NULL,

    CONSTRAINT fk_usuario_monitoreo 
        FOREIGN KEY (idUsuario) 
        REFERENCES medal.usuario(idUsuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_metodo_monitoreo
        FOREIGN KEY (idMetodo) 
        REFERENCES medal.metodoMonitoreoWeb(idMetodo)
);

-- 15. HISTORICO
CREATE TABLE IF NOT EXISTS medal.historicoMonitoreo (
  idLog SERIAL PRIMARY KEY,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disponible BOOLEAN NOT NULL,
  resultado INTEGER,
  idMonitor INTEGER NOT NULL,
  CONSTRAINT fk_monitoreo_web 
    FOREIGN KEY (idMonitor) 
    REFERENCES medal.monitoreoWeb(idMonitor) 
    ON DELETE CASCADE
);

-- 16. NOTIFICACIÓN 
CREATE TABLE IF NOT EXISTS medal.notificacion(
  idNotificacion SERIAL PRIMARY KEY,
  uuidNotificacion UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fechaRegistro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mensaje VARCHAR(1000),
  tipo VARCHAR(50) NOT NULL,
  idUsuario INTEGER NOT NULL,
  CONSTRAINT fk_usuario_notif 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE
);

-- 17. RECUPERACION
CREATE TABLE IF NOT EXISTS medal.recuperacionPassword(
  idRecuperacion SERIAL PRIMARY KEY,
  uuidRecuperacion UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fechaExpiracion TIMESTAMPTZ NOT NULL,
  fechaCreacion TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  token VARCHAR(100) NOT NULL,
  idUsuario INTEGER NOT NULL,
  
  CONSTRAINT fk_usuario_recupera 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE
);

-- 18. Logs intento login
CREATE TABLE IF NOT EXISTS medal.intentosLogin(
  idIntentoLogin SERIAL PRIMARY KEY,
  emailIntentado VARCHAR(200) NOT NULL,
  ipOrigen VARCHAR(39) NOT NULL,
  exitoso BOOLEAN DEFAULT FALSE NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Auditoria 
CREATE TABLE IF NOT EXISTS medal.auditoria(
  idAuditoria SERIAL PRIMARY KEY,
  fechaEvento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipoAccion VARCHAR(50) NOT NULL,
  direccionIpOrigen VARCHAR(39),
  nivelSeveridad VARCHAR(50) NOT NULL DEFAULT 'bajo',
  uuidAuditoria UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  idUsuario INTEGER NOT NULL,
  CONSTRAINT fk_usuario_reservaCalendario 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE

);

-- 20. reservaClaendario
CREATE TABLE IF NOT EXISTS medal.reservaClaendario(
  idCalendario SERIAL PRIMARY KEY,
  fechaInicio DATE NOT NULL,
  uuidCalendario UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  descripcion VARCHAR(500),
  nombre VARCHAR(50) NOT NULL,
  fechaFin DATE NOT NULL,
  idUsuario INTEGER NOT NULL,
  CONSTRAINT fk_usuario_reservaCalendario 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE,
  idMaquina INTEGER NOT NULL,
  CONSTRAINT fk_Maquina_reservaCalendario
    FOREIGN KEY(idMaquina) 
    REFERENCES medal.Maquina(idMaquina)
    ON DELETE CASCADE
);


-- 21 Peticiones:

CREATE TABLE IF NOT EXISTS medal.peticion(
  idPeticion SERIAL PRIMARY KEY,
  uuidPeticion UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(50) NOT NULL,
  usuarioPeticion INTEGER NOT NULL, 
  CONSTRAINT fk_usuario_creador_peticion 
    FOREIGN KEY (usuarioPeticion) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE,
  usuarioSupervisor INTEGER NOT NULL,
  CONSTRAINT fk_usuario_supervisor_peticion 
    FOREIGN KEY (usuarioSupervisor) 
    REFERENCES medal.usuario(idUsuario) 
    ON DELETE CASCADE  
);


-- 23 Momento ejecucion
CREATE TABLE IF NOT EXISTS medal.momentoEjecucion(
  idMomentoEjecucion SERIAL PRIMARY KEY,
  nombre VARCHAR(25) NOT NULL,
  descripcion VARCHAR(500)
);



-- 22 Detalle de las peticiones

CREATE TABLE IF NOT EXISTS medal.detallePeticionAcceso(
  idPetAcceso SERIAL PRIMARY KEY,
  cpuSolicitada INTEGER NOT NULL,
  gpuSolicitada INTEGER NOT NULL,
  nombreProyectoAsociado VARCHAR(50) NOT NULL,
  nombreServicioAsociado VARCHAR(100) NOT NULL,
  prioridadTarea INTEGER NOT NULL,
  docker VARCHAR(50),
  sistemaOperativo VARCHAR(100),
  comentariosAdicionales VARCHAR(500),
  tiempoEstimadoTarea INTEGER, 
  aceptaTos BOOLEAN DEFAULT TRUE,
  nombreAccesoNativo VARCHAR(50),
  disco INTEGER NOT NULL,
  justificacionAccesoNativo VARCHAR(1000),
  ram INTEGER NOT NULL, 
  idPeticionReferencia INTEGER NOT NULL,
  CONSTRAINT fk_peticion_asociada 
    FOREIGN KEY(idPeticionReferencia)
    REFERENCES medal.peticion(idPeticion)
    ON DELETE CASCADE,
  idMomentoEjecucion INTEGER NOT NULL,
  CONSTRAINT fk_momento_ejecucion
    FOREIGN KEY (idMomentoEjecucion)
    REFERENCES medal.momentoEjecucion(idMomentoEjecucion)
    ON DELETE CASCADE
);




-- 24 TAREAS REALIZAR
CREATE TABLE IF NOT EXISTS medal.tareasRealizar(
  idTarea SERIAL PRIMARY KEY,
  nombre VARCHAR(50),
  descripcion VARCHAR(500)
);

--25 TABLA OPERA
CREATE TABLE IF NOT EXISTS medal.realiza(
  idTarea INTEGER NOT NULL,
  idPetAcceso INTEGER NOT NULL,
  PRIMARY KEY(idTarea, idPetAcceso),
  CONSTRAINT fk_tarea 
    FOREIGN KEY (idTarea)
    REFERENCES medal.tareasRealizar(idTarea)
    ON DELETE CASCADE,
  CONSTRAINT fk_peticion_acceso
    FOREIGN KEY (idPetAcceso)
    REFERENCES medal.detallePeticionAcceso(idPetAcceso)
    ON DELETE CASCADE
);



-- 26 TABLA ALOJADO
CREATE TABLE IF NOT EXISTS medal.alojado(
  idPetAcceso INTEGER NOT NULL,
  idMaquina INTEGER NOT NULL,
  justificacionVariosMaquina VARCHAR(500),
  PRIMARY KEY(idPetAcceso, idMaquina),
  CONSTRAINT fk_peticion_acceso
    FOREIGN KEY(idPetAcceso) 
    REFERENCES medal.detallePeticionAcceso(idPetAcceso)
    ON DELETE CASCADE,
  CONSTRAINT fk_Maquina 
    FOREIGN KEY (idMaquina)
    REFERENCES medal.Maquina(idMaquina)
    ON DELETE CASCADE
);

-- 27 PROPIETARIO
CREATE TABLE IF NOT EXISTS medal.propietario(
  idUsuario INTEGER NOT NULL,
  idMaquina INTEGER NOT NULL,
  PRIMARY KEY(idUsuario, idMaquina),
  CONSTRAINT fk_maquina 
    FOREIGN KEY (idMaquina)
    REFERENCES medal.maquina(idMaquina)
    ON DELETE CASCADE,
  CONSTRAINT fk_usuario
    FOREIGN KEY (idUsuario)
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE
);



-- 4. SERVICIO
CREATE TABLE IF NOT EXISTS medal.servicio(
  idServicio SERIAL PRIMARY KEY,
  uuidServicio UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  nombreServicio VARCHAR(100) NOT NULL,
  descripcionTecnica VARCHAR(1000),
  entorno VARCHAR(1000),
  publico BOOLEAN DEFAULT FALSE,
  softwareBase VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE,
  nivelSeveridad VARCHAR(50),
  idUsuario INTEGER NOT NULL,
  CONSTRAINT fk_usuarioDueno 
    FOREIGN KEY (idUsuario) 
    REFERENCES medal.usuario(idUsuario),
  idPeticion INTEGER NOT NULL,
  CONSTRAINT fk_nace_peticion 
    FOREIGN KEY (idPeticion) 
    REFERENCES medal.peticion(idPeticion)
);

-- 5. CORRE 
CREATE TABLE IF NOT EXISTS medal.corre (
    idServicio INTEGER NOT NULL,
    idMaquina INTEGER NOT NULL,
    PRIMARY KEY (idServicio, idMaquina),
    CONSTRAINT fk_corre_servicio
        FOREIGN KEY (idServicio)
        REFERENCES medal.servicio(idServicio)
        ON DELETE CASCADE,
    CONSTRAINT fk_corre_Maquina
        FOREIGN KEY (idMaquina)
        REFERENCES medal.Maquina(idMaquina)
        ON DELETE CASCADE
);

-- 6. PUERTOS ABIERTOS 
CREATE TABLE IF NOT EXISTS medal.puertosAbiertos(
  idPuerto SERIAL PRIMARY KEY,
  numeroPuertoMaquina INTEGER NOT NULL,
  protocolo VARCHAR(50),
  nombreServicio VARCHAR(100),
  puertoVirtual INTEGER,
  idServicio INTEGER NOT NULL, 
  CONSTRAINT uq_puerto_servicio 
        UNIQUE (numeroPuertoMaquina, idServicio),
  CONSTRAINT fk_puertos_servicio
      FOREIGN KEY (idServicio)
      REFERENCES medal.servicio(idServicio)
      ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS medal.puertas(
  idPuerta SERIAL PRIMARY KEY,
  nombre VARCHAR(250),
  ubicacion VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS medal.accede(
  idUsuario INTEGER NOT NULL, 
  idPuerta INTEGER NOT NULL,
  PRIMARY KEY(idUsuario, idPuerta),
  CONSTRAINT fk_usuario
    FOREIGN KEY(idUsuario) 
    REFERENCES medal.usuario(idUsuario)
    ON DELETE CASCADE,
  CONSTRAINT fk_puerta 
    FOREIGN KEY(idPuerta)
    REFERENCES medal.puertas(idPuerta)
    ON DELETE CASCADE
);
