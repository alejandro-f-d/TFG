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
			const proyectosMap = new Map();
			result.rows.forEach((row) => {
				proyectosMap.set(Number(row.idgitlab), row.idproyecto);
			});
			return proyectosMap;
		} catch (error) {
			console.error("Error al obtener IDs de la tabla proyectosGitlab:", error);
			throw error;
		}
	}

	static async registrarIdProyectoLocal(idGitlab, nombre, descripcion) {
		const uuidProyecto = uuidv4();
		try {
			// Intentamos usar la query enriquecida; si faltasen parámetros usa la minimal de respaldo
			const queryConfig = GITLAB_QUERYS.ALTA_PROYECTO;
			const result = await pool.query(queryConfig, [
				uuidProyecto,
				nombre || `Proyecto ${idGitlab}`,
				descripcion || null,
				idGitlab,
			]);
			return result.rows[0].idproyecto;
		} catch (error) {
			console.error(
				`Error al registrar idGitlab ${idGitlab} en la tabla proyectosGitlab:`,
				error,
			);
			throw error;
		}
	}

	static async deleteProyecto(idProyecto) {
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
	 * Orquestador principal de sincronización de la infraestructura de GitLab hacia MEDAL.
	 */
	static async syncAllProjectsFromUsers() {
		console.log("[START] Iniciando sincronización relacional pura...");

		const usuariosMap = await this.getAllUsuariosActivos();
		if (usuariosMap.size === 0) {
			console.log(
				"[SYNC] No hay usuarios con valor numérico en columna 'gitlab'. Cancelando.",
			);
			return { created: 0, deleted: 0, membershipChanges: 0 };
		}

		const proyectosLocalesMap = await this.getAllProyectos();
		const seenGitlabProjectIds = new Set();
		const seenGitlabGroupIds = new Set();

		const counters = {
			createdCount: 0,
			deletedCount: 0,
			membershipChangesCount: 0,
		};

		// PASO 1: Grupos globales compartidos (Organizaciones comunes en GitLab)
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
				);
			}
		} catch (err) {
			console.error("[!] Error en grupos globales:", err.message);
		}

		// PASO 2: Repositorios individuales de cada usuario (Incluyendo privados y archivados)
		console.log(
			"\n[PASO 2] Recorriendo repositorios individuales por ID de GitLab...",
		);
		for (const [gitlabNumericId] of usuariosMap.entries()) {
			try {
				console.log(
					`   -> Revisando proyectos del usuario GitLab ID: ${gitlabNumericId}`,
				);
				const personalProjects =
					await obtenerTodosLosProyectosUser(gitlabNumericId);

				for (const gitlabProj of personalProjects) {
					if (seenGitlabProjectIds.has(gitlabProj.id)) continue;
					seenGitlabProjectIds.add(gitlabProj.id);

					const localProjectId = await this._ensureProjectExists(
						gitlabProj,
						proyectosLocalesMap,
						counters,
					);
					if (localProjectId) {
						// Sincronizamos membresías individuales del proyecto
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

		// PASO 3: Recolección de basura / Purga de repositorios eliminados en la plataforma (404)
		console.log(
			"\n[PASO 3] Recolectando basura (404 de repositorios eliminados)...",
		);
		for (const [idGitlab, idProyecto] of proyectosLocalesMap.entries()) {
			if (seenGitlabProjectIds.has(idGitlab)) continue;

			// Validación unitaria para evitar falsos positivos
			const existsInGitlab = await checkProjectExists(idGitlab);
			if (!existsInGitlab) {
				try {
					console.log(
						`  [PURGA] ID GitLab ${idGitlab} inactivo/borrado. Eliminando ID local ${idProyecto}.`,
					);
					await this.deleteProyecto(idProyecto);
					counters.deletedCount++;
				} catch (err) {
					console.error(
						`  [!] Error borrando ID local ${idProyecto}:`,
						err.message,
					);
				}
			}
		}

		console.log("\n[FIN] Sincronización finalizada.");
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
	) {
		if (seenGitlabGroupIds.has(grupo.id)) return;
		seenGitlabGroupIds.add(grupo.id);

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

			const localProjectId = await this._ensureProjectExists(
				gitlabProj,
				proyectosLocalesMap,
				counters,
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

	static async _ensureProjectExists(gitlabProj, proyectosLocalesMap, counters) {
		let localProjectId = proyectosLocalesMap.get(gitlabProj.id);
		if (!localProjectId) {
			try {
				localProjectId = await this.registrarIdProyectoLocal(
					gitlabProj.id,
					gitlabProj.name,
					gitlabProj.description,
				);
				counters.createdCount++;
				console.log(
					`    [Registrado] Mapeo local para ID GitLab: ${gitlabProj.id} (${gitlabProj.name})`,
				);
				proyectosLocalesMap.set(gitlabProj.id, localProjectId);
			} catch (err) {
				return null;
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
						`    [Removido] ID Usuario local ${localMemberId} desvinculado del ID GitLab ${gitlabProjectId}`,
					);
				} catch (err) {}
			}
		}
	}
}

export default GitlabModel;
