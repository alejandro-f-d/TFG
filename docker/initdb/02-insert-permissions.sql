

INSERT INTO medal.usuario 
(nombre, apellido1, apellido2, teams, esResponsable, usuarioVPN, correoInstitucional, activo, wifi, tarjetaAcceso, dirIpLastLogin, contrasena, gitlab, jefeLaboratorio)
VALUES
('Alejandro','Fisac','Delgado',true,false,'afisac','alejandro.fisac.contact@gmail.com',true,true,'0767','10.0.0.10','$2b$10$ZQ8lNQrd8pZrTOW9xdF2UuCZ.NF3aKi.xIhEinMm2TxzjM1ATMtgK','afisac',true),
('test', 'test', 'test', true, true, 'test', 'test@gmail.com', true, true, '02022', '10.0.0.5', '$2b$10$S2hEdX/ql7foYueMV1JgKuVhWle2fSxZLhD6kTyxz5DLvPOnLdRWG', 'test', false),
('test2', 'test2', 'test2', true, true, 'test2', 'test2@gmail.com', true, true, '02022', '10.0.0.5', '$2b$10$S2hEdX/ql7foYueMV1JgKuVhWle2fSxZLhD6kTyxz5DLvPOnLdRWG', 'test2', false);

;

; -- Creación de un usuario para poder hacer las pruebas de manera rápida


-- ====================================
-- Permisos:
-- ====================================

-- CREATE TABLE IF NOT EXISTS medal.permisos(
--   idPermiso SERIAL PRIMARY KEY,
--   alias VARCHAR(50) NOT NULL UNIQUE,
--   nombre VARCHAR(100) NOT NULL,
--   descripcion VARCHAR(500),
--   modulo VARCHAR(30) NOT NULL, 
--   -- uuidPermiso UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
-- );

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('admin:total', 'Administrador total', 'Permite al usuario realizar cualquier acción en el sistema.', 'administrador');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('null:null', 'null', 'null', 'null');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('usr:crearUsuario', 'Creación de usuario.', 'Permite al usuario que lo posee la creación de usuarios en el sistema.', 'usuario');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('usr:getUsuario', 'Get de usuarios.', 'Permite al usuario que lo posee el get de todos los usuarios con filtro y el get de un usuario en especifico con uuid.', 'usuario');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('usr:editUsuario', 'Edición de usuario.', 'Permite al usuario que lo posee el patch del usuario o establecerlo como inactivo.', 'usuario');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('perm:listarPermisos', 'Listar permisos.', 'Permite el listado de permisos al usuario que lo posee.', 'permisos');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('maq:postMaquina', 'Creación de una nueva máquina.', 'Permite al usuario la creación de una nueva máquina.', 'maquina');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('maq:getAll', 'Listado de todas las máquinas.', 'Permite al usuario que lo posee el listado de todas las máquinas.', 'maquina');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('maq:getServer', 'Listado de todos los servidores.', 'Permite al usuario listar únicamente los servidores.', 'maquina');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('maq:deleteServer', 'Borrar máquina.', 'Permite al usuario que lo posee el borrado de los servidores by uuid.', 'maquina');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('maq:editServer', 'Edición de la información de un servidor.', 'Permite al usuario que lo posee la edición del servidor por patch.', 'maquina');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('servicios:getAll', 'Obtener todo el listado de servicios.', 'Permite al usuario obtener todo el listado de servicios.', 'servicios');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('gitlab:postProyecto', 'Creación de un nuevo proyecto.', 'Permite al usuario la creación de un nuevo proyecto de gitlab.', 'gitlab');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('gitlab:getProyecto', 'Obtención de la lista de proyectos.', 'Permite al usuario obtener la lista de proyectos o un proyecto específico.', 'gitlab');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('roles:postRoles', 'Creación de roles', 'Permite al usuario crear roles en la plataforma con unos permisos determinados.', 'roles');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('roles:deleteRol', 'Eliminar rol especifico.', 'Permite al usuario eliminar un rol', 'roles');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('puertas:postPuerta', 'Agregar una nueva puerta', 'Permite al usuario crear una nueva puerta.', 'puertas');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('puertas:getPuertas', 'Listado de puertas.', 'Obtiene el listado de todas las puertas.', 'puertas');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('dispositivo:postDispositivo', 'Creación  de dispositivos.', 'Permite al usuario la creación de dispositivos.', 'dispostivos');

INSERT INTO medal.permisos(alias, nombre, descripcion, modulo) values('dispositivo:getDispositivo', 'Listado de dispositivos.', 'Permite al usuario acceder al inventariaje de dispositivos.', 'dispositivos');

 

INSERT INTO medal.tipodispositivo (idtipodispositivo, nombre, descripcion) VALUES
-- TUS REGISTROS ORIGINALES
(1, 'SSD', 'Disco de estado sólido (SATA/NVMe)'),
(2, 'HDD', 'Disco duro mecánico tradicional'),

-- ALMACENAMIENTO Y LEGADO
(3, 'Cinta Magnética', 'Unidad de respaldo LTO o similares'),
(4, 'NAS', 'Almacenamiento conectado en red'),
(5, 'Pendrive', 'Memoria USB flash de almacenamiento'),
(6, 'Disquetera External', 'Unidad de lectura de discos de 3.5 pulgadas'),

-- REDES Y CABLEADO
(7, 'Cable de Red', 'Latiguillo Ethernet (Cat 5e, 6, 6a, 7)'),
(8, 'Switch', 'Conmutador de red de datos'),
(9, 'Router', 'Enrutador de comunicaciones/Gateway'),
(10, 'Access Point', 'Punto de acceso inalámbrico'),
(11, 'Transceptor SFP', 'Módulo de conexión para fibra óptica'),

-- PERIFÉRICOS Y CAPTURA
(12, 'Cámara', 'Cámara de seguridad, webcam o digital'),
(13, 'Escáner', 'Digitalizador de documentos o fotos'),
(14, 'Lector QR/Barras', 'Escáner para gestión de inventarios'),
(15, 'Monitor', 'Pantalla de visualización (LCD, LED, OLED)'),
(16, 'Impresora Térmica', 'Impresora de tickets o etiquetas'),

-- INFRAESTRUCTURA Y PROTECCIÓN
(17, 'SAI/UPS', 'Sistema de alimentación ininterrumpida'),
(18, 'PDU', 'Unidad de distribución de energía para rack'),
(19, 'KVM Switch', 'Control de múltiples CPUs con un monitor/teclado'),

-- OTROS / RAROS
(20, 'Raspberry Pi', 'Microordenador de placa única'),
(21, 'Dongle Licencia', 'Llave USB física para software (HASP)'),
(22, 'Docking Station', 'Base de expansión para ordenadores portátiles'),
(23, 'Bridge', 'Puente de conexión entre protocolos de red');

-- ====================================
-- Roles:
-- ====================================

-- CREATE TABLE IF NOT EXISTS medal.roles(
--   idRole SERIAL PRIMARY KEY,
--   nombre VARCHAR(50) NOT NULL,
--   uuidRole UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), 
--   fechaCreacion DATE NOT NULL DEFAULT CURRENT_DATE,
--   idUsuario INTEGER NOT NULL, 
--   CONSTRAINT fk_usuario_creador 
--     FOREIGN KEY (idUsuario) 
--     REFERENCES medal.usuario(idUsuario)
-- );



INSERT INTO medal.roles(nombre, idUsuario) values('admin', 1);
INSERT INTO medal.roles(nombre, idUsuario) values('responsable', 1);
INSERT INTO medal.roles(nombre, idUsuario) values('usuariobase',1);



--
-- -- 10. ROLES TIENE
-- CREATE TABLE IF NOT EXISTS medal.rolesTiene (
--     idRole INTEGER NOT NULL,
--     idUsuario INTEGER NOT NULL,
--     PRIMARY KEY (idRole, idUsuario),
--     CONSTRAINT fk_rolesTiene_role
--         FOREIGN KEY (idRole)
--         REFERENCES medal.roles(idRole)
--         ON DELETE CASCADE,
--     CONSTRAINT fk_rolesTiene_usuario
--         FOREIGN KEY (idUsuario)
--         REFERENCES medal.usuario(idUsuario)
--         ON DELETE CASCADE
-- );
--

INSERT INTO medal.rolesTiene(idRole, idUsuario) values(1,1);
INSERT INTO medal.rolesTiene(idRole, idUsuario) values(2,2);
INSERT INTO medal.rolesTiene(idRole, idUsuario) values(3,3);


-- -- 12. OPERA CON
-- CREATE TABLE IF NOT EXISTS medal.operaCon (
--     idRole INTEGER NOT NULL,
--     idPermiso INTEGER NOT NULL,
--     PRIMARY KEY (idRole, idPermiso),
--     CONSTRAINT fk_operaCon_role
--         FOREIGN KEY (idRole)
--         REFERENCES medal.roles(idRole)
--         ON DELETE CASCADE,
--     CONSTRAINT fk_operaCon_permiso
--         FOREIGN KEY (idPermiso)
--         REFERENCES medal.permisos(idPermiso)
--         ON DELETE CASCADE
-- );

INSERT INTO medal.operaCon(idRole, idPermiso) values(1,1);
INSERT INTO medal.operaCon(idRole, idPermiso) values(2,3);
INSERT INTO medal.operaCon(idRole, idPermiso) values(2,7);
INSERT INTO medal.operaCon(idRole, idPermiso) values(2,9);
INSERT INTO medal.operaCon(idRole, idPermiso) values(3,2);

