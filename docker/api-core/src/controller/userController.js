import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { addEmailToQueue } from "../eda/queue.js";
import crypto from "crypto";

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
			gitlab,
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
			jefeLaboratorio,
			duenoMaquina,
			esResponsable,
		} = req.body;

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

		let resultado;
		const dominio = obtenerDominio(correoInstitucional).toLowerCase();

		// console.log(dominio);
		if (dominio.includes("upm")) {
			resultado = await UserModel.postUserUpm(req.body);
		} else {
			if (!contrasena) {
				return res.status(400).json({
					error: `La contraseña es obligatoria para usuarios externos.`,
				});
			}
			resultado = await UserModel.postUser(req.body);
		}

		if (resultado.status === "OK") {
			// EDA: Correo electrónico de alta en el sistema.
			await addEmailToQueue({
				template: "WELCOME_USER", // Identificador de la plantilla
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
			return res.status(500).json({ error: resultado.error });
		}
	} catch (error) {
		console.error("Error en postUser Controller:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getUserByUuid = async (req, res) => {
	try {
		const { uuid } = req.params;
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
		return res.status(200).json({
			message: "Usuario encontrado con éxito.",
			info: usuario,
		});
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
		if (page < 1 || limit < 1) {
			return res.status(400).json({ error: "Petición invalida" });
		}

		const resultado = await UserModel.getAllUsers(page, limit, filtroNombre);
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
		const darBaja = req.query.darBaja === "true";
		// console.log(darBaja);
		const permisos = req.user?.permisos || [];
		const uuidDelToken = req.user?.uuid;

		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(uuid)) {
			return res
				.status(404)
				.json({ error: "User no encontrado (Formato de ID inválido)." });
		}
		if (
			permisos.includes("admin:total") ||
			permisos.includes("usr:editUsuario") ||
			uuidDelToken === uuid
		) {
			if (camposCambiados.contrasena) {
				const salt = await bcrypt.genSalt(10);
				camposCambiados.contrasena = await bcrypt.hash(
					camposCambiados.contrasena,
					salt,
				);
			}
			if (darBaja && !uuidDelToken === uuid) {
				//Si está activo, solamente se pasa el usuario a que ya no está activo, el resto de campos se mantienen igual.
				const resultado = await UserModel.darBaja(uuid);
				if (resultado == 2) {
					return res.status(404).json({ error: "Usuario no encontrado." });
				}
				if (resultado.rowCount === 0) {
					return res.status(404).json({
						error: "Usuario al que se le quiere dar de baja no encontrado.",
					});
				}
				return res.status(204).json({
					message: "Usuario dado de baja de manera correcta.",
				});
			}
			if (Object.keys(camposCambiados).length === 0) {
				return res
					.status(400)
					.json({ error: "No se han enviado campos a actualizar." });
			}
			const resultado = await UserModel.patchUser(
				uuid,
				camposCambiados,
				uuidDelToken === uuid &&
					!permisos.includes("usr:editUsuario") &&
					!permisos.includes("admin:total"),
			);
			if (resultado.rowCount === 0) {
				return res.status(404).json({ error: "Usuario no encontrado." });
			}
			if (resultado == 2) {
				return res.status(404).json({ error: "Usuario no encontrado." });
			}

			return res.status(204).json({
				message: "Usuario actualizado.",
			});
		} else {
			return res
				.status(403)
				.json({ error: "Careces de los permisos necesarios" });
		}
	} catch (error) {
		console.error("Error en el patchUser", error);
		return res.status(500).json({ error: "Error en el servidor." });
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
		const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
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
				// permisos: resBbdd.permisos || [],
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
		console.log(
			"Se ha inetentado hacer un login del siguiente correo con resultado.",
			correoInstitucional,
			resBdd,
		);
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

		const resetUrl = `${process.env.API_DIRECTION}/api/reset-password?token=${resetToken}`;

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
