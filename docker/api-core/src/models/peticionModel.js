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
}
export default PeticionModel;
