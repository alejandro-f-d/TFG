import pool from "../bbdd/conexion.js";
import { PETICION_QUERY } from "../querys/peticionQuery.js";
import { v4 as uuidv4 } from "uuid";
class PeticionModel {
	static async postPeticion(data, uuidUsuario) {
		const {
			nombreProyectoAsociado,
			servidorAsociado,
			necesidadServidor,
			tareasServidor,
			cpuSolicitada,
			gpuSolicitada,
			prioridadTarea,
			docker,
			sistemaOperativo,
			comentariosAdicionales,
			tiempoEstimadoTarea,
			nombreAccesoNativo,
			disco,
			ram,
			momentoEjecucion,
			nombreServicioAsociado,
			justificacionAccesoNativo,
			fechaFin,
		} = data;

		const uuidPeticion = uuidv4();
		const client = await pool.connect();

		try {
			await client.query("BEGIN");

			const resDatosUser = await client.query(
				PETICION_QUERY.OBTENER_DATOS_USUARIO,
				[uuidUsuario],
			);

			if (resDatosUser.rowCount === 0) {
				return 1;
			}
			const user = resDatosUser.rows[0];
			const esResponsable = user.esresponsable;
			const idUsuario = user.idusuario;
			const correoInstitucional = user.correoinstitucional;
			const nombreCompleto = user.nombre_completo;

			if (esResponsable) {
				return 2;
			}

			const resDatosResponsable = await client.query(
				PETICION_QUERY.OBTENER_DATOS_RESPONSABLE,
				[user.responsable],
			);

			if (resDatosResponsable.rowCount === 0) {
				return 3;
			}

			const nombreSupervisor = resDatosResponsable.rows[0].nombre_completo;
			console.log("El nombre del supervisor es: ", nombreSupervisor);
			const momentoEjecucionRes = await client.query(
				PETICION_QUERY.OBTENER_MOMENTO_EJECUCION,
				[momentoEjecucion],
			);
			if (momentoEjecucionRes.rowCount === 0) {
				return 4;
			}
			const prioridadTareaRes = await client.query(
				PETICION_QUERY.OBTENER_PRIORIDAD_TAREA,
				[prioridadTarea],
			);
			if (prioridadTareaRes.rowCount === 0) {
				return 5;
			}

			const resTablaPeticion = await client.query(
				PETICION_QUERY.POST_TABLA_PETICION,
				[uuidPeticion, idUsuario, user.responsable, fechaFin],
			);
			const idPeticion = resTablaPeticion.rows[0].idpeticion;

			await client.query(PETICION_QUERY.POST_DETALLE_PETICION, [
				idPeticion,
				cpuSolicitada,
				gpuSolicitada,
				nombreProyectoAsociado,
				nombreServicioAsociado,
				prioridadTarea,
				docker,
				sistemaOperativo,
				comentariosAdicionales,
				tiempoEstimadoTarea,
				nombreAccesoNativo,
				disco,
				justificacionAccesoNativo,
				ram,
				momentoEjecucion,
			]);

			const nombresMaquinas = [];
			for (const maquinaId of servidorAsociado) {
				const resMaq = await client.query(PETICION_QUERY.POST_MAQUINA, [
					idPeticion,
					maquinaId,
				]);
				nombresMaquinas.push(resMaq.rows[0].nombre_maquina);
			}

			await client.query("COMMIT");

			return {
				nombreCompleto: nombreCompleto,
				correoInstitucional: correoInstitucional,
				nombreSupervisor: nombreSupervisor,
				servidoresNombres: nombresMaquinas.join(", "),
				...data, // Aquí ya vienen las keys en camelCase desde el esquema de Joi
				fechaSolicitud: new Date().toISOString(),
				finNecesidadServicio: fechaFin,
				momentoEjecucion: momentoEjecucionRes.rows[0].nombre,
				prioridadTarea: prioridadTareaRes.rows[0].nombre,
				idPeticion: idPeticion,
				uuid: uuidPeticion,
			};
		} catch (error) {
			if (client) await client.query("ROLLBACK");
			console.error("Error en postPeticion:", error);
			throw error;
		} finally {
			client.release();
		}
	}
	static async verificarPermiso(userId, peticionUuid, esRevisor) {
		try {
			const query = esRevisor
				? PETICION_QUERY.OBTENER_RESPONSABLE
				: PETICION_QUERY.DUENO_PETICION;
			const res = await pool.query(query, [peticionUuid]);

			if (res.rowCount === 0) return 2; // 404

			const idAComparar = esRevisor
				? res.rows[0].id_responsable_del_creador
				: res.rows[0].usuariopeticion;

			return idAComparar === userId ? 0 : 1;
		} catch (error) {
			console.error("Error en verificarPermiso:", userId, peticionUuid, error);
			throw error;
		}
	}
	static async getPeticionByUuid(uuidPeticion) {
		try {
			const res = await pool.query(PETICION_QUERY.GET_PROYECTO_BY_UUID, [
				uuidPeticion,
			]);
			if (res.rowCount === 0) {
				return 2; //404
			}
			return res.rows[0];
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener una petición por uuid.",
				error,
			);
		}
	}
	static async getUuidDoc(uuid) {
		try {
			const resUuid = await pool.query(PETICION_QUERY.OBTENER_UUID_DOC, [uuid]);
			if (resUuid.rowCount === 0) {
				return 2; //404
			}
			console.log(
				"Se ha encontrado lo siguiente en la base de datos.",
				resUuid.rows[0],
			);
			return {
				uuidDocumento: resUuid.rows[0].uuiddocumento,
				nombre: resUuid.rows[0].nombreproyectoasociado,
			};
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el uuid del documento en el almacenamiento de objetos.",
				uuid,
				error,
			);
			throw error;
		}
	}
	static async getAllPeticiones(
		page = 1,
		limit = 10,
		filtroNombre = "",
		status = null,
		verTodos = false,
		userId = null,
	) {
		const offset = (page - 1) * limit;
		const busqueda = `%${filtroNombre}%`;
		const busquedaStatus = status ? `%${status}%` : "%%";

		try {
			const queryGetAll = verTodos
				? PETICION_QUERY.OBTENER_PETICIONES_PAGINACION_ALL
				: PETICION_QUERY.OBTENER_PETICIONES_PAGINACION_FILTRADO;
			const queryCount = verTodos
				? PETICION_QUERY.COUNT_PETICIONES_ALL
				: PETICION_QUERY.COUNT_PETICIONES_FILTRADO;

			const valuesGetAll = [busqueda, busquedaStatus, limit, offset];
			const valuesCount = [busqueda, busquedaStatus];

			if (!verTodos) {
				valuesGetAll.push(userId);
				valuesCount.push(userId);
			}

			const [resGetAll, countRes] = await Promise.all([
				pool.query(queryGetAll, valuesGetAll),
				pool.query(queryCount, valuesCount),
			]);

			const totalItems = parseInt(countRes.rows[0].count);
			if (totalItems === 0) {
				return 2;
			}

			return {
				status: "OK",
				rows: resGetAll.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
					limit: limit,
				},
			};
		} catch (error) {
			console.error("Error al obtener peticiones:", error);
			throw error;
		}
	}
	static async esUserCreador(uuid, userId) {
		try {
			const creadorId = await pool.query(PETICION_QUERY.DUENO_PETICION, [uuid]);
			if (creadorId.rowCount === 0) {
				return 2;
			}
			const firmadoUsuario = creadorId.rows[0].firmadousuario;

			return creadorId.rows[0].usuariopeticion === userId && !firmadoUsuario; // Puede realizar la firma ya que todavía no la ha hecho.
		} catch (error) {
			console.error(
				"Se ha producido un error al verificar si es el creador de la petición.",
			);
			throw error;
		}
	}
	static async esEncargado(uuid, userId) {
		try {
			const supervisorId = await pool.query(
				PETICION_QUERY.OBTENER_RESPONSABLE,
				[uuid],
			);
			if (supervisorId.rowCount === 0) {
				return 2;
			}
			const firmadoSupervisor = supervisorId.rows[0].firmado_supervisor;
			return (
				supervisorId.rows[0].id_responsable_del_creador === userId &&
				!firmadoSupervisor
			); // Puede realizar la firma si todavía no lo ha hecho.
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el encargado de una petición.",
				error,
			);
			throw error;
		}
	}
	static async setFirmado(uuidPeticion, nivelFirma) {
		const queries = {
			1: PETICION_QUERY.SET_USUARIO,
			2: PETICION_QUERY.SET_SUPERVISOR,
			3: PETICION_QUERY.SET_JEFE,
		};

		const querySeleccionada = queries[nivelFirma];
		if (!querySeleccionada) {
			throw new Error(`Nivel de firma '${nivelFirma}' no reconocido.`);
		}
		try {
			const res = await pool.query(querySeleccionada, [uuidPeticion]);
			if (res.rowCount === 0) {
				throw new Error(
					"No se encontró ninguna petición con el UUID proporcionado.",
				);
			}
			return res;
		} catch (error) {
			console.error(
				`Error al actualizar firma nivel ${nivelFirma} para la petición ${uuidPeticion}:`,
				error,
			);
			throw error;
		}
	}
	static async obtenerCorreoSupervisor(userId) {
		try {
			const resQuery = await pool.query(
				PETICION_QUERY.OBTENER_CORREO_SUPERVISOR,
				[userId],
			);
			if (resQuery.rowCount === 0) {
				throw new Error(`Usuario inválido con id: ${userId}`);
			}
			return resQuery.rows[0].correo_supervisor;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el correo del supervisor.",
				userId,
				error,
			);
			throw error;
		}
	}
	static async obtenerListaJefesLaboratorio() {
		try {
			const listaCorreos = await pool.query(
				PETICION_QUERY.OBTENER_CORREO_JEFE_LABORATORIO,
				[],
			);
			if (listaCorreos.rowCount === 0) {
				throw new Error(`No se han encontrado jefes de laboratorio.`);
			}
			return listaCorreos.rows[0].lista_destinatarios;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener la lista de los jefes de laboratorio.",
				error,
			);
			throw error;
		}
	}
	static async obtenerCorreoUsuarioSupervisor(uuidPeticion) {
		try {
			const listaCorreos = await pool.query(
				PETICION_QUERY.OBTENER_LISTA_DESTINATARIOS_APROBACION,
				[uuidPeticion],
			);
			if (listaCorreos.rowCount === 0) {
				throw new Error(
					`No se han encontrado usuarios vinculados a una petición.`,
				);
			}
			return listaCorreos.rows[0].lista_destinatarios;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener los correos del supervisor y el usuario.",
				error,
			);
			throw error;
		}
	}
	static async denegarPeticion(uuidPeticion, razon) {
		try {
			await pool.query(PETICION_QUERY.DENEGAR_PETICION, [uuidPeticion, razon]);
		} catch (error) {
			console.error(
				"Se ha producido un error al denegar una petición.",
				uuidPeticion,
				razon,
				error,
			);
			throw error;
		}
	}
	static async obtenerCorreoInstitucionalUserCreador(uuidPeticion) {
		try {
			const correoUser = await pool.query(
				PETICION_QUERY.OBTENER_CORREO_INST_CREADOR,
				[uuidPeticion],
			);
			if (correoUser.rowCount === 0) {
				throw new Error(
					`No se ha encontrado del usuario que ha realizado la petición.`,
				);
			}
			return correoUser.rows[0].correoinstitucional;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el correo institucional de una petición.",
				uuidPeticion,
				error,
			);
			throw error;
		}
	}
	static async getEstadoPeticion(uuidPeticion) {
		try {
			const estado = await pool.query(PETICION_QUERY.OBTENER_STATUS_QUERY, [
				uuidPeticion,
			]);
			if (estado.rowCount === 0) {
				return 2;
			}
			return estado.rows[0].estado;
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener el estado de una petición.",
				uuidPeticion,
				error,
			);
			throw error;
		}
	}
	static async establecerRealizada(uuidPeticion) {
		try {
			const cambiarEstado = await pool.query(PETICION_QUERY.MARCAR_COMPLETADA, [
				uuidPeticion,
			]);
			return { status: "OK" };
		} catch (error) {
			console.error(
				"Se ha producido un error al marcar como realizada la petición",
				uuidPeticion,
				error,
			);
			throw error;
		}
	}
	static async addMetadata(metadata, uuidPeticion, nivel) {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			const resPeticionId = await pool.query(PETICION_QUERY.OBTENER_ID_PET, [
				uuidPeticion,
			]);

			if (resPeticionId.rowCount === 0) {
				throw new Error("Id de la petición no encontrado.");
			}

			const peticionId = resPeticionId.rows[0].idpeticion;
			if (!peticionId) {
				throw new Error(`Id de la petición no encontrado.`);
			}
			if (nivel === 1) {
				// Se trata de un usuario base.
				await client.query(PETICION_QUERY.ANADIR_METADATA_FIRMA_USER_BASE, [
					peticionId,
					metadata.firmante,
					metadata.fecha_firma,
					metadata.nivel.description,
				]);
			} else if (nivel === 2) {
				// Supervisor.
				await client.query(PETICION_QUERY.ANADIR_METADATA_SUPERVISOR, [
					metadata.firmante,
					metadata.fecha_firma,
					metadata.nivel.description,
					peticionId,
				]);
			} else if (nivel === 3) {
				// Jefe de laboratorio.
				await client.query(PETICION_QUERY.ANADIR_METADATA_JEFE_LAB, [
					metadata.firmante,
					metadata.fecha_firma,
					metadata.nivel.description,
					peticionId,
				]);
			} else {
				throw new Error(`Nivel de la firma no reconocido.`);
			}
			await client.query("COMMIT");
		} catch (error) {
			await client.query("ROLLBACK");
			console.error(
				"Se ha producido un error al introducir la metadata:",
				metadata,
				uuidPeticion,
				nivel,
				error,
			);
			throw error;
		} finally {
			client.release();
		}
	}
	static async getPeticionesPropias(
		page,
		limit,
		filtroNombre,
		status,
		idUsuario,
	) {
		try {
			const offset = (page - 1) * limit;
			const busqueda = `%${filtroNombre}%`;
			const busquedaStatus = status ? `%${status}%` : "%%";
			const resGetAll = await pool.query(
				PETICION_QUERY.OBTENER_PETICIONES_PAGINACION_ALL_PROPIAS,
				[busqueda, busquedaStatus, limit, offset, idUsuario],
			);
			const totalItems = parseInt(resGetAll.rowCount);
			if (totalItems === 0) {
				return 2;
			}

			return {
				status: "OK",
				rows: resGetAll.rows,
				pagination: {
					totalItems,
					totalPages: Math.ceil(totalItems / limit),
					currentPage: page,
					limit: limit,
				},
			};
		} catch (error) {
			console.error(
				"Se ha producido un error al obtener las peticiones de un usuario específico.",
				error,
			);
			throw error;
		}
	}
}
export default PeticionModel;
