import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { USER_QUERIES } from "../querys/userQuery.js";
import {
	crearUsuarioGitlab,
	actualizarUsernameGitlab,
} from "../integrations/gitlab.js";

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

	static async getAllUsers(
		page,
		limit,
		filtroNombre,
		filtroStatus,
		filtroGitlab,
		filtroRevisores,
	) {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const esActivo = filtroStatus === "activo";

			let queryData;
			let queryCount;

			if (filtroRevisores) {
				queryData = USER_QUERIES.GET_ALL_PAGINADO_REVISORES;
				queryCount = USER_QUERIES.COUNT_BY_NOMBRE_REVISORES;
			} else if (filtroGitlab) {
				queryData = USER_QUERIES.GET_ALL_PAGINADO_GITLAB;
				queryCount = USER_QUERIES.COUNT_BY_NOMBRE_GITLAB;
			} else {
				queryData = USER_QUERIES.GET_ALL_PAGINADO;
				queryCount = USER_QUERIES.COUNT_BY_NOMBRE;
			}

			const [res, countRes] = await Promise.all([
				pool.query(queryData, [limit, offset, busqueda, esActivo]),
				pool.query(queryCount, [busqueda, esActivo]),
			]);

			const totalItems = parseInt(countRes.rows[0].count, 10);

			return {
				status: "OK",
				rows: res.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: Number(page),
					limit: Number(limit),
				},
			};
		} catch (error) {
			console.error("Error en getAllUsers (Model):", error.message);
			throw error;
		}
	}

	static async patchUser(uuid, campos, esUser, fotoFile) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			const jsonFields = ["roles", "puertasAutorizadas", "duenoMaquina"];
			jsonFields.forEach((field) => {
				if (typeof campos[field] === "string") {
					try {
						const val = campos[field].trim();
						campos[field] =
							val === "" ||
							val === "null" ||
							val === "undefined" ||
							val === "[]"
								? []
								: JSON.parse(val);
					} catch (e) {
						campos[field] = [];
					}
				}
			});

			const booleanFields = ["teams", "esresponsable", "activo", "wifi"];
			booleanFields.forEach((field) => {
				if (campos[field] !== undefined) {
					if (typeof campos[field] === "string") {
						campos[field] = campos[field].toLowerCase() === "true";
					}
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

			if (campos.responsable) {
				campos.responsable = parseInt(campos.responsable, 10);
				if (isNaN(campos.responsable)) campos.responsable = null;
			}

			const {
				roles,
				puertasAutorizadas,
				duenoMaquina,
				passwordGitlab,
				...camposUsuario
			} = campos;

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
						"responsable",
					];

			if (!esUser && camposUsuario.gitlab !== undefined) {
				const statusActivo =
					camposUsuario.activo !== undefined ? camposUsuario.activo : true;

				if (camposUsuario.gitlab !== null && statusActivo) {
					if (passwordGitlab) {
						// CASO A: Crear usuario en GitLab (Tiene password temporal)
						try {
							const userActual = await client.query(USER_QUERIES.GET_CORREO, [
								uuid,
							]);
							if (userActual.rows.length > 0) {
								const resCrearGitlab = await crearUsuarioGitlab(
									userActual.rows[0].correoinstitucional,
									camposUsuario.gitlab,
									userActual.rows[0].nombre,
									passwordGitlab,
								);
								await client.query(USER_QUERIES.UPDATE_ID_GITLAB, [
									resCrearGitlab.id,
									uuid,
								]);
							}
						} catch (error) {
							console.error("Error creando usuario en GitLab:", error);
							throw new Error("No se pudo crear la cuenta en GitLab.");
						}
					} else {
						// CASO B: Actualizar nombre de usuario en GitLab
						try {
							const idGitlabRes = await client.query(
								USER_QUERIES.GET_GITLAB_ID,
								[uuid],
							);
							if (idGitlabRes.rows.length > 0 && idGitlabRes.rows[0].gitlab) {
								await actualizarUsernameGitlab(
									idGitlabRes.rows[0].gitlab,
									camposUsuario.gitlab,
								);
							}
						} catch (error) {
							console.error("Error actualizando username en GitLab:", error);
						}
					}
				}
			}

			const camposFiltrados = {};
			Object.keys(camposUsuario).forEach((key) => {
				const dbKey = key.toLowerCase();
				if (
					camposPermitidos.includes(key) &&
					camposUsuario[key] !== undefined
				) {
					camposFiltrados[dbKey] = camposUsuario[key];
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
				return 2; // Not Found
			}

			if (!esUser) {
				const relaciones = [
					{
						data: roles,
						deleteQuery: USER_QUERIES.DELETE_ROLES_USER,
						insertQuery: USER_QUERIES.INSERT_ROL_RELACION,
						inverse: false,
					},
					{
						data: puertasAutorizadas,
						deleteQuery: USER_QUERIES.DELETE_PUERTAS_USER,
						insertQuery: USER_QUERIES.INSERT_PUERTA_RELACION,
						inverse: true,
					},
					{
						data: duenoMaquina,
						deleteQuery: USER_QUERIES.DELETE_MAQUINAS_USER,
						insertQuery: USER_QUERIES.INSERT_MAQUINA_RELACION,
						inverse: true,
					},
				];

				for (const rel of relaciones) {
					if (rel.data !== undefined) {
						await client.query(rel.deleteQuery, [idUsuarioReal]);
						if (Array.isArray(rel.data)) {
							for (const itemId of rel.data) {
								if (itemId) {
									const params = rel.inverse
										? [idUsuarioReal, itemId]
										: [itemId, idUsuarioReal];
									await client.query(rel.insertQuery, params);
								}
							}
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
			console.error("Error crítico en UserModel.patchUser:", error);
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
	static async getGitlabId(uuid) {
		try {
			const resGitlabId = await pool.query(USER_QUERIES.GET_GITLAB_ID, [uuid]);
			if (resGitlabId.rowCount === 0) {
				return 2;
			}
			return resGitlabId.rows[0].gitlab;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el gitlab id por el uuid del usuario.",
				error,
			);
			throw error;
		}
	}
	static async getStatusUser(uuid) {
		try {
			const resGetStatus = await pool.query(USER_QUERIES.GET_STATUS_USER, [
				uuid,
			]);
			return {
				status: resGetStatus.rows[0].activo,
				gitlab: resGetStatus.rows[0].gitlab,
			};
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener la información del estado del usuario y sus servicios.",
				error,
			);
			throw error;
		}
	}
	static async activar(uuid) {
		try {
			await pool.query(USER_QUERIES.ACTIVAR, [uuid]);
		} catch (error) {
			console.error(
				"Se ha producido un error al activar el usuario.",
				error,
				uuid,
			);
			throw error;
		}
	}
}

export default UserModel;
