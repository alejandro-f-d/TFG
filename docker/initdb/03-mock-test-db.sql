-- -- =========================
-- -- 1. USUARIOS
-- -- =========================
-- INSERT INTO medal.usuario 
-- (nombre, apellido1, apellido2, teams, esResponsable, usuarioVPN, correoInstitucional, activo, wifi, tarjetaAcceso, dirIpLastLogin, contrasena, gitlab, jefeLaboratorio)
-- VALUES
-- ('Carlos','Admin','Root',true,true,'cadmin','carlos.admin@medal.com',true,true,'TARJ001','10.0.0.10','hash1','cadmin',true),
-- ('Ana','Lopez','Perez',false,false,'alopez','ana.lopez@medal.com',true,true,'TARJ002','10.0.0.11','hash2','alopez',false),
-- ('Luis','Martinez','Sanchez',true,false,'lmartinez','luis.martinez@medal.com',true,false,'TARJ003','10.0.0.12','hash3','lmartinez',false);
--
-- -- Asignar responsable
-- UPDATE medal.usuario SET responsable = 1 WHERE idUsuario IN (2,3);
--

-- =========================
-- 2. MAQUINAS
-- =========================
INSERT INTO medal.maquina
(nombre,caducidadSSL,certificadoSslActivo,emisorSsl,direccionIpPrivadaV4,direccionIpPublicaV4,puertaEnlaceV4,ram,sistemaOperativo, esservidor)
VALUES
('srv-docker-01','2026-12-31',true,'LetsEncrypt','192.168.1.10','80.80.80.10','192.168.1.1',64,'Ubuntu 22.04', 'false'),
('srv-gpu-01','2026-06-30',true,'LetsEncrypt','192.168.1.20','80.80.80.20','192.168.1.1',128,'Ubuntu 20.04', 'true');


-- =========================
-- 3. TIPO DISPOSITIVO
-- =========================


-- =========================
-- 4. DISPOSITIVOS
-- =========================
INSERT INTO medal.dispositivos
(nombre, puntoMontaje,capacidad,capacidadUsada,tecnologia,idMaquina,idTipoDispositivo)
VALUES
('Docker', '/var/lib/docker',1000,450,'NVMe',1,1),
('ultradisk','/data',4000,1200,'SATA',2,2);


-- =========================
-- 5. PROYECTOS
-- =========================
INSERT INTO medal.proyectosGitlab(nombre,descripcion)
VALUES
('Monitorizacion','Proyecto de monitoreo web'),
('IA-Research','Proyecto de investigación IA');


INSERT INTO medal.participa VALUES
(2,1),
(3,2),
(1,1);


-- -- =========================
-- -- 6. ROLES Y PERMISOS
-- -- =========================
-- INSERT INTO medal.roles(nombre,idUsuario)
-- VALUES
-- ('ADMIN',1),
-- ('DEVOPS',1);
--
-- INSERT INTO medal.rolesTiene VALUES
-- (1,1),
-- (2,2);
--
-- INSERT INTO medal.permisos(alias,nombre,descripcion,modulo)
-- VALUES
-- ('USR_READ','Leer usuarios','Permite leer usuarios','USUARIOS'),
-- ('USR_WRITE','Modificar usuarios','Permite modificar usuarios','USUARIOS');
--
-- INSERT INTO medal.operaCon VALUES
-- (1,1),
-- (1,2),
-- (2,1);
--

-- =========================
-- 7. METODO MONITOREO
-- =========================
INSERT INTO medal.metodoMonitoreoWeb(nombre,alias,descripcion)
VALUES
('HTTP_STATUS','http','Verifica código HTTP'),
('PING','ping','Verifica conectividad ICMP');

INSERT INTO medal.monitoreoWeb
(nombreObjetivo,direccion,valorUltimaRespuesta,valorEsperado,idUsuario,idMetodo)
VALUES
('Google','https://google.com',200,200,1,1);

INSERT INTO medal.historicoMonitoreo(disponible,resultado,idMonitor)
VALUES
(true,200,1),
(false,500,1);


-- =========================
-- 8. NOTIFICACION Y LOGIN
-- =========================
INSERT INTO medal.notificacion(mensaje,tipo,idUsuario)
VALUES
('Servicio caído','ALERTA',1);

-- INSERT INTO medal.recuperacionPassword(fechaExpiracion,token,idUsuario)
-- VALUES
-- (NOW() + INTERVAL '1 day','token123',2);

INSERT INTO medal.intentosLogin(emailIntentado,ipOrigen,exitoso)
VALUES
('ana.lopez@medal.com','10.0.0.50',false),
('ana.lopez@medal.com','10.0.0.50',true);


-- =========================
-- 9. AUDITORIA
-- =========================
INSERT INTO medal.auditoria(tipoAccion,direccionIpOrigen,nivelSeveridad,idUsuario)
VALUES
('LOGIN','10.0.0.50','medio',2);


-- =========================
-- 10. RESERVA
-- =========================
INSERT INTO medal.reservaCalendario(fechaInicio,fechaFin,descripcion,nombre,idUsuario,idMaquina)
VALUES
('2026-03-01','2026-03-05','Reserva para pruebas GPU','Reserva IA',2,2);


-- =========================
-- 11. PETICIONES
-- =========================
INSERT INTO medal.peticion(estado,usuarioPeticion,usuarioSupervisor)
VALUES
('APROBADA',2,1);

INSERT INTO medal.momentoEjecucion(nombre,descripcion)
VALUES
('INMEDIATO','Ejecución inmediata');

INSERT INTO medal.detallePeticionAcceso
(cpuSolicitada,gpuSolicitada,nombreProyectoAsociado,nombreServicioAsociado,
prioridadTarea,docker,sistemaOperativo,tiempoEstimadoTarea,disco,ram,
idPeticionReferencia,idMomentoEjecucion)
VALUES
(8,1,'IA-Research','Servicio-IA',1,'docker:latest','Ubuntu 22.04',48,500,32,1,1);


INSERT INTO medal.tareasRealizar(nombre,descripcion)
VALUES
('Instalar Docker','Instalación entorno contenedores');

INSERT INTO medal.realiza VALUES (1,1);

INSERT INTO medal.alojado VALUES (1,2,'Uso de GPU dedicada');


-- =========================
-- 12. PROPIETARIO
-- =========================
INSERT INTO medal.propietario VALUES
(1,1),
(2,2);


-- =========================
-- 13. SERVICIO
-- =========================
INSERT INTO medal.servicio
(nombreServicio,descripcionTecnica,entorno,publico,softwareBase,nivelSeveridad,idUsuario,idPeticion)
VALUES
('API-IA','Servicio IA REST','PROD',true,'Python 3.11','alto',2,1);

INSERT INTO medal.corre VALUES (1,2);

INSERT INTO medal.puertosAbiertos(numeroPuertoMaquina,protocolo,nombreServicio,puertoVirtual,idServicio)
VALUES
(443,'TCP','HTTPS',8443,1);


-- =========================
-- 14. PUERTAS Y ACCESOS
-- =========================
INSERT INTO medal.puertas(nombre,ubicacion)
VALUES
('Puerta CPD','Edificio A - Planta Baja');

INSERT INTO medal.accede VALUES (1,1),(2,1);



-- 1. Reserva para el test de filtro por nombre "IA"
INSERT INTO medal.reservacalendario (
    uuidcalendario, nombre, descripcion, fechainicio, fechafin, idusuario, idmaquina
) VALUES (
    'ba7cc39d-1dc2-4090-acb2-592708f9bfcd', 
    'Reserva IA profunda', 
    'Pruebas de modelos LLM en GPU', 
    '2026-03-01 09:00:00', 
    '2026-03-01 18:00:00', 
    1, 1
);

-- 2. Reserva a mitad de marzo (para el test de rango de fechas)
INSERT INTO medal.reservacalendario (
    uuidcalendario, nombre, descripcion, fechainicio, fechafin, idusuario, idmaquina
) VALUES (
    'c123e456-e89b-12d3-a456-426614174000', 
    'Mantenimiento preventivo', 
    'Revisión trimestral de nodos', 
    '2026-03-15 08:00:00', 
    '2026-03-15 12:00:00', 
    1, 1
);

-- 3. Reserva fuera de rango (Febrero) para verificar que el filtro excluye
INSERT INTO medal.reservacalendario (
    uuidcalendario, nombre, descripcion, fechainicio, fechafin, idusuario, idmaquina
) VALUES (
    'd789f123-a456-4266-b789-426614174111', 
    'Reserva antigua', 
    'Esta no debería salir en el filtro de marzo', 
    '2026-02-10 10:00:00', 
    '2026-02-10 20:00:00', 
    1, 1
);
