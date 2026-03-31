import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { USER_QUERIES } from "../querys/userQuery.js";

class UserModel {
	static async guardarBdd(datos, userId, client = pool) {
		if (Array.isArray(datos.roles)) {
			for (const rolId of datos.roles) {
				await client.query(USER_QUERIES.INSERT_ROL_RELACION, [rolId, userId]);
			}
		}
		if (Array.isArray(datos.puertasAutorizadas)) {
			for (const puertaId of datos.puertasAutorizadas) {
				await client.query(USER_QUERIES.INSERT_PUERTA_RELACION, [
					userId,
					puertaId,
				]);
			}
		}
		if (Array.isArray(datos.duenoMaquina)) {
			for (const maquinaId of datos.duenoMaquina) {
				await client.query(USER_QUERIES.INSERT_MAQUINA_RELACION, [
					userId,
					maquinaId,
				]);
			}
		}
	}

	static async postUserUpm(datos) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const uuid = uuidv4();
			const valores = [
				datos.nombre,
				datos.apellido1,
				datos.apellido2 || null,
				datos.teams || false,
				datos.esResponsable || false,
				datos.usuarioVpn || null,
				datos.correoInstitucional,
				datos.activo,
				datos.fechaIncorporacion,
				datos.fechaFin || null,
				datos.wifi || false,
				datos.tarjetaAcceso || null,
				uuid,
				datos.gitlab || null,
				datos.profesorResponsable || null,
			];

			const res = await client.query(USER_QUERIES.POST_USER(false), valores);
			await this.guardarBdd(datos, res.rows[0].idusuario, client);

			await client.query("COMMIT");
			return { status: "OK", id: uuid };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	static async postUser(datos) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const uuid = uuidv4();
			const passwordHaseada = await bcrypt.hash(datos.contrasena, 10);
			const valores = [
				datos.nombre,
				datos.apellido1,
				datos.apellido2 || null,
				datos.teams || false,
				datos.esResponsable || false,
				datos.usuarioVpn || null,
				datos.correoInstitucional,
				datos.activo,
				datos.fechaIncorporacion,
				datos.fechaFin || null,
				datos.wifi || false,
				datos.tarjetaAcceso || null,
				uuid,
				datos.gitlab || null,
				datos.profesorResponsable || null,
				passwordHaseada,
			];

			const res = await client.query(USER_QUERIES.POST_USER(true), valores);
			await this.guardarBdd(datos, res.rows[0].idusuario, client);

			await client.query("COMMIT");
			return { status: "OK", id: uuid };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	static async getUserByUuid(uuid) {
		try {
			const res = await pool.query(USER_QUERIES.GET_BY_UUID, [uuid]);
			return { status: "OK", info: res };
		} catch (error) {
			throw error;
		}
	}

	static async getAllUsers(page, limit, filtroNombre, filtroStatus) {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const status = filtroStatus === "activo";
			const query = filtroStatus
				? USER_QUERIES.GET_ALL_PAGINADO_GITLAB
				: USER_QUERIES.GET_ALL_PAGINADO;
			const res = await pool.query(query, [limit, offset, busqueda, status]);
			const countRes = await pool.query(USER_QUERIES.COUNT_BY_NOMBRE, [
				busqueda,
				status,
			]);

			const totalItems = parseInt(countRes.rows[0].count);
			return {
				status: "OK",
				rows: res.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
				},
			};
		} catch (error) {
			throw error;
		}
	}

	static async patchUser(uuid, campos, esUser, fotoFile) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			["roles", "puertasAutorizadas", "duenoMaquina"].forEach((field) => {
				if (typeof campos[field] === "string") {
					try {
						if (
							!campos[field] ||
							campos[field] === "null" ||
							campos[field] === "[]"
						) {
							campos[field] = [];
						} else {
							campos[field] = JSON.parse(campos[field]);
						}
					} catch (e) {
						console.error(`Error parseando el campo ${field}:`, e);
						campos[field] = [];
					}
				}
			});

			const booleanFields = ["teams", "esresponsable", "activo", "wifi"];
			booleanFields.forEach((field) => {
				if (campos[field] !== undefined) {
					if (campos[field] === "true") campos[field] = true;
					if (campos[field] === "false") campos[field] = false;
				}
			});

			const nullableFields = [
				"fechafin",
				"fechaincorporacion",
				"responsable",
				"tarjetaacceso",
				"usuariovpn",
				"gitlab",
			];
			nullableFields.forEach((field) => {
				if (
					campos[field] === "" ||
					campos[field] === "null" ||
					campos[field] === "undefined"
				) {
					campos[field] = null;
				}
			});

			if (campos.responsable !== undefined && campos.responsable !== null) {
				campos.responsable = parseInt(campos.responsable, 10);
				if (isNaN(campos.responsable)) campos.responsable = null;
			}

			const { roles, puertasAutorizadas, duenoMaquina, ...camposUsuario } =
				campos;

			const camposPermitidos = esUser
				? ["nombre", "apellido1", "apellido2"]
				: [
						"nombre",
						"apellido1",
						"apellido2",
						"teams",
						"esresponsable",
						"usuariovpn",
						"correoinstitucional",
						"activo",
						"fechaincorporacion",
						"fechafin",
						"wifi",
						"tarjetaacceso",
						"diriplastlogin",
						"contrasena",
						"gitlab",
						"responsable",
					];

			const camposFiltrados = {};
			Object.keys(camposUsuario).forEach((key) => {
				if (
					camposPermitidos.includes(key) &&
					camposUsuario[key] !== undefined
				) {
					camposFiltrados[key.toLowerCase()] = camposUsuario[key];
				}
			});

			let idUsuarioReal;
			const keys = Object.keys(camposFiltrados);

			if (keys.length > 0) {
				const values = Object.values(camposFiltrados);
				values.push(uuid);
				const res = await client.query(
					USER_QUERIES.UPDATE_DYNAMIC(keys),
					values,
				);
				idUsuarioReal = res.rows[0]?.idusuario;
			} else {
				const res = await client.query(USER_QUERIES.GET_ID_BY_UUID, [uuid]);
				idUsuarioReal = res.rows[0]?.idusuario;
			}

			if (!idUsuarioReal) {
				await client.query("ROLLBACK");
				return 2;
			}

			if (!esUser) {
				if (roles !== undefined) {
					await client.query(USER_QUERIES.DELETE_ROLES_USER, [idUsuarioReal]);
					if (Array.isArray(roles)) {
						for (const rId of roles) {
							if (rId)
								await client.query(USER_QUERIES.INSERT_ROL_RELACION, [
									rId,
									idUsuarioReal,
								]);
						}
					}
				}
				if (puertasAutorizadas !== undefined) {
					await client.query(USER_QUERIES.DELETE_PUERTAS_USER, [idUsuarioReal]);
					if (Array.isArray(puertasAutorizadas)) {
						for (const pId of puertasAutorizadas) {
							if (pId)
								await client.query(USER_QUERIES.INSERT_PUERTA_RELACION, [
									idUsuarioReal,
									pId,
								]);
						}
					}
				}
				// Máquinas
				if (duenoMaquina !== undefined) {
					await client.query(USER_QUERIES.DELETE_MAQUINAS_USER, [
						idUsuarioReal,
					]);
					if (Array.isArray(duenoMaquina)) {
						for (const mId of duenoMaquina) {
							if (mId)
								await client.query(USER_QUERIES.INSERT_MAQUINA_RELACION, [
									idUsuarioReal,
									mId,
								]);
						}
					}
				}
			}

			if (fotoFile) {
				await client.query(USER_QUERIES.INSERT_PHOTO, [fotoFile.buffer, uuid]);
			}

			await client.query("COMMIT");
			return { status: "OK", idusuario: idUsuarioReal };
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error en UserModel.patchUser:", error);
			throw error;
		} finally {
			client.release();
		}
	}
	static async darBaja(uuid) {
		return await pool.query(USER_QUERIES.DAR_BAJA, [uuid]);
	}

	static async getPasswordByCorreoInstitucional(correo) {
		const res = await pool.query(USER_QUERIES.GET_AUTH_DATA, [correo]);
		return res.rows[0];
	}

	static async intentoInicioSesion(ip, correo, exitoso) {
		await pool.query(USER_QUERIES.REGISTRAR_INTENTO_LOGIN, [
			ip,
			correo,
			exitoso,
		]);
		return { status: "Ok" };
	}

	static async updateIp(ip, correo) {
		const res = await pool.query(USER_QUERIES.UPDATE_LAST_IP, [ip, correo]);
		return res.rowCount > 0;
	}

	static async resetPassword(email, expiresAt, hash) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const resIdUser = await client.query(
				USER_QUERIES.EXISTE_USER_CORREO_ELECTRONICO,
				[email],
			);
			if (resIdUser.rows.length === 0) {
				await client.query("ROLLBACK");
				return 2; // Usuario no encontrado.
			}

			const checkSpam = await client.query(USER_QUERIES.CHECK_SPAM, [
				resIdUser.rows[0].idusuario,
			]);

			if (checkSpam.rows.length > 0) {
				const ultimoIntento = new Date(checkSpam.rows[0].fechacreacion);
				const ahora = new Date();
				const diferenciaMinutos = (ahora - ultimoIntento) / 1000 / 60;

				if (diferenciaMinutos < 5) {
					return 3;
				}
			}

			// Invalidamos tokens anteriores:
			const invalidacionAnterioresId = await client.query(
				USER_QUERIES.INVALIDAR_TOKENS_ANTERIORES,
				[resIdUser.rows[0].idusuario],
			);
			// Añadimos el token que será ahora enviado por correo electrónico.
			await client.query(USER_QUERIES.AGREGAR_TOKEN, [
				hash,
				expiresAt,
				resIdUser.rows[0].idusuario,
			]);
			await client.query("COMMIT");
			return { nombre: resIdUser.rows[0].nombre };
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
	static async updatePassword(tokenHashEnviado, passwordHasheada) {
		try {
			const result = await pool.query(USER_QUERIES.UPDATE_CONTRASENA_TOKEN, [
				tokenHashEnviado,
				passwordHasheada,
			]);
			if (result.rowCount === 0) {
				return 2;
			}
			return { status: "OK" };
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer el update de contraseña.",
			);
			throw error;
		}
	}
	static async getPasswordByUuid(uuid) {
		try {
			const res = await pool.query(USER_QUERIES.OBTENER_PASSWORD_UUID, [uuid]);
			if (res.rowCount === 0) {
				return 2;
			}
			return res.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener la contraseña actual del usuario via uuid",
				error,
			);
			throw error;
		}
	}
	static async updatePasswordInterfaz(contrasena, uuid) {
		try {
			const res = await pool.query(USER_QUERIES.UPDATE_PASSWORD, [
				contrasena,
				uuid,
			]);
			if (res.rowCount === 0) {
				throw new Error("Error con el update de la password.");
			}
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer un update de la password de un usuario",
				contrasena,
				uuid,
				error,
			);
		}
	}
}

export default UserModel;
