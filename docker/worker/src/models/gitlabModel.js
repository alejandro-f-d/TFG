// src/models/gitlabModel.js
import pool from "../bbdd/conexion.js";
import { v4 as uuidv4 } from "uuid";
import { GITLAB_QUERYS } from "../querys/gitlabQuerys.js";
import {
	getUserGroups,
	getGroupMembers,
	getAllGroupProjects,
	getAllProjectMembers,
	obtenerTodosLosProyectosUser,
	checkProjectExists,
	obtenerGruposYMiembros,
} from "../integrations/gitlab.js";

class GitlabModel {
	static async getAllUsuariosActivos() {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_ALL_USUARIOS_ACTIVOS);
			const usuariosMap = new Map();
			result.rows.forEach((row) => {
				usuariosMap.set(Number(row.gitlab), row.idusuario);
			});
			return usuariosMap;
		} catch (error) {
			console.error(
				"Error al obtener usuarios activos desde la columna gitlab:",
				error,
			);
			throw error;
		}
	}

	static async getAllProyectos() {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_ALL_PROYECTOS);
			const proyectosLista = [];
			result.rows.forEach((row) => {
				proyectosLista.push({
					idProyecto: row.idproyecto,
					idGitlab: row.idgitlab !== null ? Number(row.idgitlab) : null,
				});
			});
			return proyectosLista;
		} catch (error) {
			console.error(
				"Error al obtener la lista total de proyectos de la BD:",
				error,
			);
			throw error;
		}
	}

	static async registrarIdProyectoLocal(
		idGitlab,
		nombre,
		descripcion,
		activo,
		idGrupoGitlab = null,
	) {
		const uuidProyecto = uuidv4();
		try {
			const result = await pool.query(GITLAB_QUERYS.ALTA_PROYECTO, [
				uuidProyecto,
				idGitlab,
				nombre || `Proyecto ${idGitlab}`,
				descripcion || null,
				activo !== false,
				idGrupoGitlab,
			]);
			return result.rows[0].idproyecto;
		} catch (error) {
			console.error(
				`Error al registrar/actualizar idGitlab ${idGitlab} en la tabla proyectosGitlab:`,
				error,
			);
			throw error;
		}
	}

	static async deleteProyecto(idProyecto) {
		await pool.query(GITLAB_QUERYS.DELETE_ALL_PARTICIPANTES_PROYECTO, [
			idProyecto,
		]);
		await pool.query(GITLAB_QUERYS.DELETE_PROYECTO, [idProyecto]);
	}

	static async getMiembrosByProyecto(idProyecto) {
		const result = await pool.query(GITLAB_QUERYS.GET_MIEMBROS_BY_PROYECTO, [
			idProyecto,
		]);
		const miembrosSet = new Set();
		result.rows.forEach((row) => miembrosSet.add(row.idusuario));
		return miembrosSet;
	}

	static async upsertParticipa(idUsuario, idProyecto, rol) {
		await pool.query(GITLAB_QUERYS.ALTA_PARTICIPA, [
			idUsuario,
			idProyecto,
			rol,
		]);
	}

	static async deleteParticipa(idUsuario, idProyecto) {
		await pool.query(GITLAB_QUERYS.DELETE_PARTICIPA, [idUsuario, idProyecto]);
	}

	static mapAccessLevelToRole(accessLevel) {
		const roles = {
			10: "Guest",
			20: "Reporter",
			30: "Developer",
			40: "Maintainer",
			50: "Owner",
		};
		return roles[accessLevel] || "Developer";
	}

	/**
	 * Sincroniza e higieniza los grupos y sus miembros optimizado en un solo lote de datos.
	 */
	static async syncAllGroups(usuariosMap) {
		console.log(
			"\n[PASO 0] Iniciando sincronización optimizada de grupos de GitLab...",
		);

		const counters = {
			creados: 0,
			actualizados: 0,
			purgados: 0,
			miembrosCambios: 0,
		};
		const seenGitlabGroupIds = new Set();
		const gruposLocalesMap = new Map();

		try {
			const resLocales = await pool.query(GITLAB_QUERYS.GET_ALL_GRUPOS_LOCALES);
			resLocales.rows.forEach((row) => {
				if (row.idgitlab !== null)
					gruposLocalesMap.set(Number(row.idgitlab), row.idgrupo);
			});
		} catch (error) {
			console.error(
				"[!] Error al recuperar grupos locales de la BD:",
				error.message,
			);
			throw error;
		}

		let gruposYMiembrosApi = [];
		try {
			gruposYMiembrosApi = await obtenerGruposYMiembros();
		} catch (error) {
			console.error(
				"[!] Error crítico al invocar obtenerGruposYMiembros:",
				error.message,
			);
			return { counters, gruposLocalesMap };
		}

		for (const grupoApi of gruposYMiembrosApi) {
			seenGitlabGroupIds.add(grupoApi.id);
			let idGrupoLocal = gruposLocalesMap.get(grupoApi.id);

			try {
				const isNew = !idGrupoLocal;

				const resUpsert = await pool.query(GITLAB_QUERYS.ALTA_GRUPO_GITLAB, [
					grupoApi.nombre,
					grupoApi.descripcion,
					grupoApi.path,
					grupoApi.webUrl,
					grupoApi.id,
				]);

				idGrupoLocal = resUpsert.rows[0].idgrupo;
				gruposLocalesMap.set(grupoApi.id, idGrupoLocal);

				if (isNew) counters.creados++;
				else counters.actualizados++;

				const resMiembrosLocales = await pool.query(
					GITLAB_QUERYS.GET_MIEMBROS_BY_GRUPO,
					[idGrupoLocal],
				);
				const miembrosLocalesSet = new Set(
					resMiembrosLocales.rows.map((r) => r.idusuario),
				);
				const expectedMiembrosLocalesIds = new Set();

				for (const miembroApi of grupoApi.miembros) {
					const idUsuarioLocal = usuariosMap.get(Number(miembroApi.idUsuario));
					if (!idUsuarioLocal) continue;

					expectedMiembrosLocalesIds.add(idUsuarioLocal);

					if (!miembrosLocalesSet.has(idUsuarioLocal)) {
						await pool.query(GITLAB_QUERYS.ALTA_PERTENECE_GRUPO, [
							idUsuarioLocal,
							idGrupoLocal,
						]);
						counters.miembrosCambios++;
					}
				}

				for (const idUsuarioLocal of miembrosLocalesSet) {
					if (!expectedMiembrosLocalesIds.has(idUsuarioLocal)) {
						await pool.query(GITLAB_QUERYS.DELETE_PERTENECE_GRUPO, [
							idUsuarioLocal,
							idGrupoLocal,
						]);
						counters.miembrosCambios++;
						console.log(
							`    [Removido] Usuario local ID ${idUsuarioLocal} desvinculado del Grupo Local ID ${idGrupoLocal}`,
						);
					}
				}
			} catch (errorGrupo) {
				console.error(
					`  [!] Error procesando el grupo [${grupoApi.nombre}]:`,
					errorGrupo.message,
				);
			}
		}

		for (const [idGitlabExterno, idGrupoLocal] of gruposLocalesMap.entries()) {
			if (!seenGitlabGroupIds.has(idGitlabExterno)) {
				try {
					console.log(
						`  [PURGA 404] El Grupo GitLab ID ${idGitlabExterno} ya no existe en el servidor. Eliminando ID Grupo Local: ${idGrupoLocal}`,
					);
					await pool.query(GITLAB_QUERYS.DELETE_GRUPO_GITLAB, [idGrupoLocal]);
					counters.purgados++;
				} catch (errPurge) {
					console.error(
						`    [!] Error al purgar el grupo local obsoleto ID ${idGrupoLocal}:`,
						errPurge.message,
					);
				}
			}
		}

		console.log(
			`[FIN PASO 0] Grupos -> Creados: ${counters.creados}, Actualizados: ${counters.actualizados}, Purgados: ${counters.purgados}, Cambios Miembros: ${counters.miembrosCambios}\n`,
		);

		// Retornamos también el mapa para poder usarlo en el PASO 1
		return { counters, gruposLocalesMap };
	}

	/**
	 * Orquestador de sincronización e higiene estricta de la infraestructura de GitLab hacia MEDAL.
	 */
	static async syncAllProjectsFromUsers() {
		console.log("[START] Iniciando sincronización relacional pura...");

		const usuariosMap = await this.getAllUsuariosActivos();
		// Recogemos el mapa mapeado del PASO 0
		const { gruposLocalesMap } = await this.syncAllGroups(usuariosMap);

		if (usuariosMap.size === 0) {
			console.log(
				"[SYNC] No hay usuarios con valor numérico en columna 'gitlab'. Cancelando.",
			);
			return { created: 0, deleted: 0, membershipChanges: 0 };
		}

		const proyectosLocalesMap = new Map();
		const proyectosListaCompleta = await this.getAllProyectos();
		proyectosListaCompleta.forEach((p) => {
			if (p.idGitlab !== null)
				proyectosLocalesMap.set(p.idGitlab, p.idProyecto);
		});

		const seenGitlabProjectIds = new Set();
		const seenGitlabGroupIds = new Set();
		const counters = {
			createdCount: 0,
			deletedCount: 0,
			membershipChangesCount: 0,
		};

		// PASO 1: Grupos globales compartidos en GitLab
		console.log("\n[PASO 1] Buscando en grupos del Token...");
		try {
			const gruposGlobales = await getUserGroups();
			for (const grupo of gruposGlobales) {
				await this._syncGroupMinimal(
					grupo,
					proyectosLocalesMap,
					usuariosMap,
					seenGitlabProjectIds,
					seenGitlabGroupIds,
					counters,
					gruposLocalesMap, // <-- Pasamos el mapa de grupos para resolver IDs locales
				);
			}
		} catch (err) {
			console.error("[!] Error en grupos globales:", err.message);
		}

		// PASO 2: Repositorios individuales de cada usuario
		console.log(
			"\n[PASO 2] Recorriendo repositorios individuales por ID de GitLab...",
		);
		for (const [gitlabNumericId] of usuariosMap.entries()) {
			try {
				console.log(
					`    -> Revisando proyectos del usuario GitLab ID: ${gitlabNumericId}`,
				);
				const personalProjects =
					await obtenerTodosLosProyectosUser(gitlabNumericId);

				for (const gitlabProj of personalProjects) {
					if (seenGitlabProjectIds.has(gitlabProj.id)) continue;
					seenGitlabProjectIds.add(gitlabProj.id);

					// Pasamos null ya que son repositorios personales fuera de grupos corporativos
					const localProjectId = await this._ensureProjectExists(
						gitlabProj,
						proyectosLocalesMap,
						counters,
						null,
					);
					if (localProjectId) {
						await this._syncProjectMembershipsMinimal(
							gitlabProj.id,
							localProjectId,
							usuariosMap,
							new Map(),
							counters,
						);
					}
				}
			} catch (err) {
				console.error(
					`  [!] Error en repositorios personales del ID GitLab ${gitlabNumericId}:`,
					err.message,
				);
			}
		}

		// PASO 3: Limpieza de datos
		console.log(
			"\n[PASO 3] Ejecutando purga y limpieza estricta de la base de datos.",
		);

		const proyectosAuditoria = await this.getAllProyectos();

		for (const proy of proyectosAuditoria) {
			const { idGitlab, idProyecto } = proy;

			if (idGitlab === null || idGitlab === 0) {
				try {
					console.log(
						`  [PURGA STRICT] ID Proyecto Local ${idProyecto} posee un idGitlab NULL o 0. Procediendo a borrar.`,
					);
					await this.deleteProyecto(idProyecto);
					counters.deletedCount++;
				} catch (err) {
					console.error(
						`  [!] Error borrando registro inválido/local ID ${idProyecto}:`,
						err.message,
					);
				}
				continue;
			}

			if (seenGitlabProjectIds.has(idGitlab)) {
				continue;
			}

			const existsInGitlab = await checkProjectExists(idGitlab);
			if (!existsInGitlab) {
				try {
					console.log(
						`  [PURGA 404] El ID GitLab ${idGitlab} ya no existe en el servidor. Eliminando ID Proyecto Local: ${idProyecto}`,
					);
					await this.deleteProyecto(idProyecto);
					counters.deletedCount++;
				} catch (err) {
					console.error(
						`  [!] Error al purgar el ID local ${idProyecto}:`,
						err.message,
					);
				}
			}
		}

		console.log("\n[FIN] Sincronización y limpieza estricta finalizada.");
		return {
			created: counters.createdCount,
			deleted: counters.deletedCount,
			membershipChanges: counters.membershipChangesCount,
		};
	}

	static async _syncGroupMinimal(
		grupo,
		proyectosLocalesMap,
		usuariosMap,
		seenGitlabProjectIds,
		seenGitlabGroupIds,
		counters,
		gruposLocalesMap, // <-- Recibido del orquestador
	) {
		if (seenGitlabGroupIds.has(grupo.id)) return;
		seenGitlabGroupIds.add(grupo.id);

		// Obtenemos el id del grupo local guardado en el PASO 0
		const idGrupoLocal = gruposLocalesMap.get(grupo.id) || null;

		const groupMembersMap = new Map();
		try {
			const groupMembers = await getGroupMembers(grupo.id);
			groupMembers.forEach((m) => groupMembersMap.set(m.id, m.access_level));
		} catch (err) {
			console.error(
				`  [!] Error cargando miembros del grupo ${grupo.id}:`,
				err.message,
			);
		}

		let groupProjects = [];
		try {
			groupProjects = await getAllGroupProjects(grupo.id);
		} catch (err) {
			console.error(
				`  [!] Error cargando repos del grupo ${grupo.id}:`,
				err.message,
			);
			return;
		}

		for (const gitlabProj of groupProjects) {
			if (seenGitlabProjectIds.has(gitlabProj.id)) continue;
			seenGitlabProjectIds.add(gitlabProj.id);

			// Propagamos el idGrupoLocal detectado
			const localProjectId = await this._ensureProjectExists(
				gitlabProj,
				proyectosLocalesMap,
				counters,
				idGrupoLocal,
			);
			if (localProjectId) {
				await this._syncProjectMembershipsMinimal(
					gitlabProj.id,
					localProjectId,
					usuariosMap,
					groupMembersMap,
					counters,
				);
			}
		}
	}

	// Se añade el parámetro idGrupoGitlab al flujo de validación de existencia
	static async _ensureProjectExists(
		gitlabProj,
		proyectosLocalesMap,
		counters,
		idGrupoGitlab = null,
	) {
		const esActivo = !gitlabProj.archived;
		let localProjectId = proyectosLocalesMap.get(gitlabProj.id);

		if (!localProjectId) {
			try {
				localProjectId = await this.registrarIdProyectoLocal(
					gitlabProj.id,
					gitlabProj.name,
					gitlabProj.description,
					esActivo,
					idGrupoGitlab, // <-- Enviado a la query de inserción
				);
				counters.createdCount++;
				console.log(
					`     [Registrado] Mapeo local para ID GitLab: ${gitlabProj.id} (${gitlabProj.name}) [Activo: ${esActivo}]`,
				);
				proyectosLocalesMap.set(gitlabProj.id, localProjectId);
			} catch (err) {
				return null;
			}
		} else {
			try {
				await this.registrarIdProyectoLocal(
					gitlabProj.id,
					gitlabProj.name,
					gitlabProj.description,
					esActivo,
					idGrupoGitlab, // <-- Enviado a la query de actualización (UPSERT)
				);
			} catch (err) {
				console.error(
					`     [!] Error al actualizar metadatos del proyecto existente ${gitlabProj.id}`,
				);
			}
		}
		return localProjectId;
	}

	static async _syncProjectMembershipsMinimal(
		gitlabProjectId,
		localProjectId,
		usuariosMap,
		groupMembersMap,
		counters,
	) {
		let projectMembers = [];
		try {
			projectMembers = await getAllProjectMembers(gitlabProjectId);
		} catch (err) {
			return;
		}

		const finalGitlabMembers = new Map(groupMembersMap);
		projectMembers.forEach((m) => finalGitlabMembers.set(m.id, m.access_level));

		const localMemberIds = await this.getMiembrosByProyecto(localProjectId);
		const expectedLocalMemberIds = new Set();

		for (const [memberGitlabId, accessLevel] of finalGitlabMembers.entries()) {
			const localUserId = usuariosMap.get(Number(memberGitlabId));
			if (!localUserId) continue;

			expectedLocalMemberIds.add(localUserId);
			const role = this.mapAccessLevelToRole(accessLevel);
			try {
				await this.upsertParticipa(localUserId, localProjectId, role);
				counters.membershipChangesCount++;
			} catch (err) {}
		}

		for (const localMemberId of localMemberIds) {
			if (!expectedLocalMemberIds.has(localMemberId)) {
				try {
					await this.deleteParticipa(localMemberId, localProjectId);
					counters.membershipChangesCount++;
					console.log(
						`     [Removido] ID Usuario local ${localMemberId} desvinculado del ID GitLab ${gitlabProjectId}`,
					);
				} catch (err) {}
			}
		}
	}
}

export default GitlabModel;
