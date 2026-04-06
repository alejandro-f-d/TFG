import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { addEmailToQueue } from "../eda/queue.js";
import crypto from "crypto";
import { tienePermiso } from "../middlewares/authMiddleware.js";
import {
	obtenerUsernamePorId,
	crearUsuarioGitlab,
	bloquearUsuarioGitlab,
	reactivarUsuarioGitlab,
} from "../integrations/gitlab.js";

const verificarCorreo = (correo) => {
	if (!correo) return false;
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
	return regex.test(correo);
};

const obtenerDominio = (correo) => {
	if (!correo || !correo.includes("@")) {
		return null;
	}
	const partes = correo.split("@");
	return partes[1];
};

export const postUser = async (req, res) => {
	try {
		const {
			nombre,
			apellido1,
			apellido2,
			roles,
			correoInstitucional,
			usuarioVpn,
			puertasAutorizadas,
			profesorResponsable,
			fechaIncorporacion,
			fechaFin,
			wifi,
			activo,
			tarjetaAcceso,
			contrasena,
			dirIpLastLogin,
			teams,
			duenoMaquina,
			esResponsable,
		} = req.body;

		let gitlab = req.body.gitlab;

		if (
			!nombre ||
			!apellido1 ||
			!roles ||
			!correoInstitucional ||
			!fechaIncorporacion ||
			activo === undefined
		) {
			return res.status(400).json({ error: `Faltan parámetros obligatorios.` });
		}

		if (!verificarCorreo(correoInstitucional)) {
			return res.status(400).json({ error: `El correo está mal formado.` });
		}

		if (gitlab === "") {
			gitlab = null;
			req.body.gitlab = null;
		}

		if (gitlab !== null) {
			try {
				const resCrearGitlab = await crearUsuarioGitlab(
					correoInstitucional,
					gitlab,
					nombre,
					contrasena,
				);
				gitlab = resCrearGitlab.id;
				req.body.gitlab = resCrearGitlab.id;
			} catch (error) {
				console.error("Error al crear usuario en GitLab:", error);
				return res
					.status(500)
					.json({ error: "Error al crear la cuenta en GitLab." });
			}
		}

		console.log("ID de GitLab final:", req.body.gitlab);

		let resultado;
		const dominio = obtenerDominio(correoInstitucional).toLowerCase();

		if (dominio.includes("upm") && false) {
			// TODO: Lógica UPM
			resultado = await UserModel.postUserUpm(req.body);
		} else {
			if (!contrasena) {
				return res.status(400).json({
					error: `La contraseña es obligatoria para usuarios externos.`,
				});
			}
			resultado = await UserModel.postUser(req.body);
		}

		if (resultado && resultado.status === "OK") {
			await addEmailToQueue({
				template: "WELCOME_USER",
				to: correoInstitucional,
				nombre: nombre,
				loginUrl: `${process.env.API_DIRECTION}/login`,
			});

			return res
				.status(201)
				.location(`/api/user/${resultado.id}`)
				.json({
					message: "Usuario creado con éxito",
					uuid: resultado.id,
					url: `${process.env.API_DIRECTION}/api/user/${resultado.id}`,
				});
		} else {
			return res.status(500).json({
				error: resultado?.error || "Error al guardar en base de datos",
			});
		}
	} catch (error) {
		console.error("Error en postUser Controller:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getUserByUuid = async (req, res) => {
	try {
		const { uuid } = req.params;

		if (req.user.uuidUsuario === uuid || tienePermiso("usr:getUsuario")) {
			if (!uuid) {
				return res.status(400).json({ error: `Falta el uuid.` });
			}
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

			if (!uuidRegex.test(uuid)) {
				return res
					.status(404)
					.json({ error: "User no encontrado (Formato de ID inválido)." });
			}

			const resultado = await UserModel.getUserByUuid(uuid);
			const usuario = resultado.info.rows[0];
			if (usuario == undefined) {
				return res.status(404).json({
					message: "Usuario no encontrado.",
				});
			}
			delete usuario.contrasena;

			//Obtener el nombre de usuario en base al id de gitlab en la base de datos en caso de que sea posible.
			if (usuario.gitlab) {
				try {
					const nombreUsuarioGitlab = await obtenerUsernamePorId(
						usuario.gitlab,
					);

					if (nombreUsuarioGitlab) {
						usuario.gitlab = nombreUsuarioGitlab;
					}
				} catch (error) {
					console.error(
						"Se ha producido un error al obtener el nombre asociado a un id de gitlab.",
						error,
					);
				}
			}

			return res.status(200).json({
				message: "Usuario encontrado con éxito.",
				info: usuario,
			});
		}
	} catch (error) {
		console.error("Error en el getUserByUuid", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getUsers = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 5;
		const filtroNombre = req.query.filtroNombre || "";
		const filtroStatus = req.query.filtroStatus || "activo";
		const filtroGitlab = req.query.filtroGitlab || false;
		const soloRevisores = req.query.filtroRevisores || false;
		if (page < 1 || limit < 1) {
			return res.status(400).json({ error: "Petición invalida" });
		}

		const resultado = await UserModel.getAllUsers(
			page,
			limit,
			filtroNombre,
			filtroStatus,
			filtroGitlab,
			soloRevisores,
		);
		if (resultado.totalItems === 0) {
			return res.status(404).json({
				message: `No se han encontrado usuarios que coincidan con: ${filtroNombre}`,
			});
		}
		const usuariosLimpios = resultado.rows.map((usuario) => {
			const { contrasena, ...sinPass } = usuario;
			return sinPass;
		});
		return res.status(200).json({
			message: "Lista de usuarios devuelta correctamente.",
			info: usuariosLimpios,
			pagination: resultado.pagination,
		});
	} catch (error) {
		console.error("Error en el getUsers", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const patchUser = async (req, res) => {
	try {
		const { uuid } = req.params;
		const camposCambiados = req.body;
		const fotoFile = req.file;
		const darBajaQuery = req.query.darBaja === "true";

		// Normalización para evitar errores.
		if (camposCambiados.activo !== undefined) {
			if (camposCambiados.activo === "true") camposCambiados.activo = true;
			if (camposCambiados.activo === "false") camposCambiados.activo = false;
		}

		const permisos = req.user?.permisos || [];
		const uuidDelToken = req.user?.uuidUsuario;

		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(uuid)) {
			return res.status(404).json({ error: "Formato de ID inválido." });
		}

		const esDueno = uuidDelToken === uuid;
		const tienePermisoEdicion =
			permisos.includes("admin:total") || permisos.includes("usr:editUsuario");

		if (!esDueno && !tienePermisoEdicion) {
			return res
				.status(403)
				.json({ error: "Careces de los permisos necesarios." });
		}

		const statusActual = await UserModel.getStatusUser(uuid);
		if (!statusActual) {
			return res.status(404).json({ error: "Usuario no encontrado." });
		}

		let estaActivoEnBD = !!statusActual.status;

		//Baja
		const solicitarBaja = darBajaQuery || camposCambiados.activo === false;

		if (solicitarBaja && estaActivoEnBD) {
			console.log("Procesando baja de usuario en servicios externos...");
			const idGitlab =
				statusActual.id_gitlab || (await UserModel.getGitlabId(uuid));
			if (idGitlab) await bloquearUsuarioGitlab(idGitlab);

			await UserModel.darBaja(uuid);
			estaActivoEnBD = false;

			if (Object.keys(camposCambiados).length <= 1 && !fotoFile) {
				return res.status(204).send();
			}
		}

		//Reactivación.
		if (!estaActivoEnBD && camposCambiados.activo === true) {
			console.log("Reactivando usuario en servicios externos...");
			const idGitlab =
				statusActual.id_gitlab || (await UserModel.getGitlabId(uuid));
			if (idGitlab) await reactivarUsuarioGitlab(idGitlab);

			await UserModel.activar(uuid);
			estaActivoEnBD = true;
		}

		if (camposCambiados.contrasena) {
			const salt = await bcrypt.genSalt(10);
			camposCambiados.contrasena = await bcrypt.hash(
				camposCambiados.contrasena,
				salt,
			);
		}

		if (Object.keys(camposCambiados).length === 0 && !fotoFile) {
			return res.status(204).send();
		}

		const soloEdicionPerfil = esDueno && !tienePermisoEdicion;
		const resultado = await UserModel.patchUser(
			uuid,
			camposCambiados,
			soloEdicionPerfil,
			fotoFile,
		);

		if (resultado === 2 || resultado?.rowCount === 0) {
			return res.status(404).json({
				error: "Usuario no encontrado durante la actualización final.",
			});
		}

		return res.status(204).send();
	} catch (error) {
		console.error("Error en patchUser Controller:", error);
		return res.status(500).json({ error: `Error interno: ${error.message}` });
	}
};

export const login = async (req, res) => {
	const { correoInstitucional, contrasena } = req.body;
	if (!correoInstitucional) {
		return res.status(400).json({
			error: "Error con los parámetros proporcionados en la petición.",
		});
	}
	try {
		// Log de inicio de sesión.
		// const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
		console.log("IP Directa (Nginx):", req.connection.remoteAddress);
		console.log("Cabecera Forwarded:", req.headers["x-forwarded-for"]);
		console.log("IP que Express cree que es la real:", req.ip);
		const ip = req.ip;

		if (!contrasena) {
			// login no exitoso.
			const resLogLogin = await UserModel.intentoInicioSesion(
				ip,
				correoInstitucional,
				false,
			);
			return res.status(401).json({ error: "Credenciales inválidas." });
		}
		const resBbdd =
			await UserModel.getPasswordByCorreoInstitucional(correoInstitucional);
		if (!resBbdd) {
			// El usuario no existe en la BD
			await UserModel.intentoInicioSesion(ip, correoInstitucional, false);
			return res.status(401).json({ error: "Credenciales inválidas." });
		}
		const contrasenaHashGuardada = resBbdd.contrasena;
		const esValidaContrasena = await bcrypt.compare(
			contrasena,
			contrasenaHashGuardada,
		);
		if (!esValidaContrasena) {
			// login no exitoso.
			const resLogLogin = await UserModel.intentoInicioSesion(
				ip,
				correoInstitucional,
				false,
			);
			return res.status(401).json({ error: "Credenciales inválidas." });
		}
		const token = jwt.sign(
			{
				uuidUsuario: resBbdd.uuidusuario,
				permisos: resBbdd.permisos || [],
			},
			process.env.JWT_SECRET,
			{ expiresIn: "2h" },
		);
		// login exitoso.
		const resLogLogin = await UserModel.intentoInicioSesion(
			ip,
			correoInstitucional,
			true,
		);
		const ipUpdated = await UserModel.updateIp(ip, correoInstitucional);
		if (!ipUpdated) {
			console.error(
				"Ha ocurrido un error al actualizar la ip de un usuario.",
				ip,
				correoInstitucional,
			);
		}
		return res.status(200).json({
			message: "Login Correcto.",
			token: token,
			permisos: resBbdd.permisos,
			uuidUser: resBbdd.uuidusuario,
		});
	} catch (error) {
		console.error("Error en login:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const requestPasswordReset = async (req, res) => {
	try {
		const { correoInstitucional } = req.body;
		if (!correoInstitucional) {
			return res.status(400).json({ error: "Petición mal formada." });
		}
		const resetToken = crypto.randomUUID();
		const tokenHash = crypto
			.createHash("sha256")
			.update(resetToken)
			.digest("hex");
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 1);
		//email, expiresAt, hash
		const resBdd = await UserModel.resetPassword(
			correoInstitucional,
			expiresAt,
			tokenHash,
		);
		// console.log(
		// 	"Se ha inetentado hacer un login del siguiente correo con resultado.",
		// 	correoInstitucional,
		// 	resBdd,
		// );
		if (resBdd === 2) {
			return res.status(200).json({
				message:
					"En caso de ser un correo registrado recibirá en su bandeja de entrada el sistema de modificación de password.",
			});
		}
		if (resBdd === 3) {
			return res.status(429).json({
				error: `Demasiadas peticiones para este usuario.`,
			});
		}

		const resetUrl = `${process.env.WEB_URL}/api/reset-password?token=${resetToken}`;

		await addEmailToQueue({
			template: "PASSWORD_RESET",
			to: correoInstitucional,
			nombre: resBdd.nombre,
			resetUrl: resetUrl,
		});

		return res.status(200).json({
			message:
				"En caso de ser un correo registrado recibirá en su bandeja de entrada el sistema de modificación de password.",
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al intentar regenerar una contraseña.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const patchRecuperarPassword = async (req, res) => {
	const { token, contrasena } = req.body;

	if (!token || !contrasena) {
		return res
			.status(400)
			.json({ error: "Petición mal formada: falta token o contraseña." });
	}

	try {
		const tokenHashEnviado = crypto
			.createHash("sha256")
			.update(token)
			.digest("hex");

		const salt = await bcrypt.genSalt(10);
		const passwordHasheada = await bcrypt.hash(contrasena, salt);
		const resUpdatePassword = await UserModel.updatePassword(
			tokenHashEnviado,
			passwordHasheada,
		);
		if (resUpdatePassword === 2) {
			return res
				.status(400)
				.json({ error: "El enlace es invalido, ha expirado o ha sido usado." });
		}
		return res
			.status(200)
			.json({ message: "Contraseña actualizada con éxito." });
	} catch (error) {
		console.error("Error al procesar el cambio de contraseña:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const patchPasswordInterfaz = async (req, res) => {
	try {
		const { passwordAnterior, passwordNueva } = req.body;

		if (!passwordAnterior || !passwordNueva) {
			return res.status(400).json({ error: "Petición mal formada." });
		}

		const resBbdd = await UserModel.getPasswordByUuid(req.user.uuidUsuario);

		if (resBbdd === 2) {
			return res.status(404).json({ message: "Usuario no encontrado" });
		}

		const contrasenaHashGuardada = resBbdd.contrasena;

		const esValidaContrasena = await bcrypt.compare(
			passwordAnterior,
			contrasenaHashGuardada,
		);

		if (!esValidaContrasena) {
			return res
				.status(422)
				.json({ error: "La contraseña actual no coincide" });
		}

		const salt = await bcrypt.genSalt(10);
		const passwordHasheada = await bcrypt.hash(passwordNueva, salt);

		await UserModel.updatePasswordInterfaz(
			passwordHasheada,
			req.user.uuidUsuario,
		);

		return res.status(204).send();
	} catch (error) {
		console.error("Error al actualizar password:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
