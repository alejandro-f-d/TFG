CREATE SCHEMA IF NOT EXISTS medal;

CREATE TABLE IF NOT EXISTS medal.usuario(
  idUsuario SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL, 
  apellido1 VARCHAR(50) NOT NULL,
  apellido2 VARCHAR(50), 
  teams BOOLEAN DEFAULT FALSE,
  esResponsable BOOLEAN DEFAULT FALSE,
  usuarioVPN VARCHAR(50),
  correoInstitucional VARCHAR(100) NOT NULL UNIQUE, 
  activo BOOLEAN DEFAULT TRUE, 
  fechaIncorporacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fechaFin DATE,
  wifi BOOLEAN DEFAULT FALSE,
  tarjetaAcceso VARCHAR(20), 
  dirIpLastLogin VARCHAR(39),
  uuidUsuario UUID NOT NULL UNIQUE, 
  contrasena VARCHAR(1000) NOT NULL,
  gitlab VARCHAR(50) UNIQUE,
  responsable INTEGER REFERENCES medal.usuario(idUsuario)
);

CREATE TABLE IF NOT EXISTS medal.servidor(
  idServidor SERIAL PRIMARY KEY, 
  nombre VARCHAR(50) NOT NULL UNIQUE,
  caducidadSSL DATE,
  certificadoSslActivo BOOLEAN DEFAULT FALSE,
  emisorSsl VARCHAR(100),
  direccionIpPrivadaV4 VARCHAR(15) NOT NULL,
  uuidServidor UUID NOT NULL UNIQUE, 
  direccionIpPublicaV4 VARCHAR(15),
  direccionIpPrivadaV6 VARCHAR(39),
  direccionIpPublicaV6 VARCHAR(39),
  puertaEnlaceV4 VARCHAR(15) NOT NULL,
  puertaEnlaceV6 VARCHAR(39),
  ram INTEGER,
  sistemaOperativo VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS medal.discos(
  idDisco SERIAL PRIMARY KEY, 
  puntoMontaje VARCHAR(200) NOT NULL,
  capacidad INTEGER NOT NULL,
  capacidadUsada INTEGER,
  tecnologia VARCHAR(50) NOT NULL,
  uuidDisco UUID NOT NULL UNIQUE,
  idServidor INTEGER REFERENCES medal.servidor(idServidor)
);

