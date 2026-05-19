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
				usuariosMap.set(row.gitlab, row.idusuario);
			});
			return usuariosMap;
		} catch (error) {
			console.error("Error al obtener usuarios activos:", error);
			throw error;
		}
	}

	static async getAllProyectos() {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_ALL_PROYECTOS);
			const proyectosMap = new Map();
			result.rows.forEach((row) => {
				const idGitlab =
					row.idgitlab !== undefined ? row.idgitlab : row.id_gitlab;
				const idProyecto =
					row.idproyecto !== undefined ? row.idproyecto : row.id_proyecto;
				proyectosMap.set(idGitlab, idProyecto);
			});
			return proyectosMap;
		} catch (error) {
			console.error("Error al obtener proyectos locales:", error);
			throw error;
		}
	}

	static async getProyectoByIdGitlab(idGitlab) {
		try {
			const result = await pool.query(GITLAB_QUERYS.GET_PROYECTO_BY_ID_GITLAB, [
				idGitlab,
			]);
			return result.rows[0] || null;
		} catch (error) {
			console.error(
				`Error al obtener proyecto por idGitlab ${idGitlab}:`,
				error,
			);
			throw error;
		}
	}

	static async createProyecto({
		idGitlab,
		nombre,
		descripcion,
		fechaInicio,
		archived,
		idGrupoGitlab,
	}) {
		const uuidProyecto = uuidv4();
		const activo = !archived;
		try {
			const result = await pool.query(GITLAB_QUERYS.ALTA_PROYECTO, [
				nombre,
				descripcion,
				uuidProyecto,
				fechaInicio,
				idGitlab,
				activo,
				idGrupoGitlab,
			]);
			return result.rows[0].idproyecto;
		} catch (error) {
			console.error(`Error al insertar proyecto ${nombre} en BD:`, error);
			throw error;
		}
	}

	static async updateProyectoGrupo(idProyecto, idGrupoGitlab) {
		await pool.query(GITLAB_QUERYS.UPDATE_PROYECTO_GRUPO, [
			idGrupoGitlab,
			idProyecto,
		]);
	}

	static async updateProyectoActivo(idProyecto, archived) {
		await pool.query(GITLAB_QUERYS.UPDATE_PROYECTO_ACTIVO, [
			!archived,
			idProyecto,
		]);
	}

	static async deleteProyecto(idProyecto) {
		try {
			await pool.query(GITLAB_QUERYS.DELETE_PROYECTO, [idProyecto]);
		} catch (error) {
			console.error(
				`Error al eliminar el proyecto local ${idProyecto}:`,
				error,
			);
			throw error;
		}
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
			0: "No Access",
			5: "Minimal Access",
			10: "Guest",
			20: "Reporter",
			30: "Developer",
			40: "Maintainer",
			50: "Owner",
		};
		return roles[accessLevel] || "Developer";
	}

	/**
	 * SINCRO INVERSA: Grupos -> Miembros -> Repos de Grupo -> Repos Personales -> Purga de obsoletos
	 */
	static async syncAllProjectsFromUsers() {
		console.log(
			"[START] Iniciando sincronización guiada por Grupos con purga final...",
		);

		const usuariosMap = await this.getAllUsuariosActivos();
		if (usuariosMap.size === 0) {
			console.log("No hay usuarios activos registrados con ID de GitLab.");
			return { created: 0, updated: 0, deleted: 0, membershipChanges: 0 };
		}

		const proyectosLocalesMap = await this.getAllProyectos();
		const seenGitlabProjectIds = new Set();

		const counters = {
			createdCount: 0,
			updatedCount: 0,
			deletedCount: 0,
			membershipChangesCount: 0,
		};

		// -------------------------------------------------------------
		// PASO 1 Y 2: Recorrer Grupos, sus integrantes y sus repos
		// -------------------------------------------------------------
		console.log("\n[PASO 1] Leyendo grupos accesibles...");
		const gruposCargados = await getUserGroups();
		console.log(`-> Encontrados ${gruposCargados.length} grupos.`);

		for (const grupo of gruposCargados) {
			console.log(
				`\n=== Procesando Grupo: ${grupo.name} (ID: ${grupo.id}) ===`,
			);

			let groupMembers = [];
			const groupMembersMap = new Map();
			try {
				groupMembers = await getGroupMembers(grupo.id);
				groupMembers.forEach((m) => groupMembersMap.set(m.id, m.access_level));
				console.log(
					`  -> Integrantes detectados en el grupo: ${groupMembers.length}`,
				);
			} catch (err) {
				console.error(
					`  -> Error mapeando miembros del grupo ${grupo.id}:`,
					err.message,
				);
			}

			let groupProjects = [];
			try {
				groupProjects = await getAllGroupProjects(grupo.id);
				console.log(`  -> Repositorios en este grupo: ${groupProjects.length}`);
			} catch (err) {
				console.error(
					`  -> Error obteniendo repositorios del grupo ${grupo.id}:`,
					err.message,
				);
				continue;
			}

			for (const gitlabProj of groupProjects) {
				seenGitlabProjectIds.add(gitlabProj.id);

				const localProjectId = await this._syncProjectStructure(
					gitlabProj,
					proyectosLocalesMap,
					grupo.id,
					counters,
				);

				if (localProjectId) {
					await this._syncProjectMemberships(
						gitlabProj.id,
						localProjectId,
						usuariosMap,
						groupMembersMap,
						counters,
					);
				}
			}
		}

		// -------------------------------------------------------------
		// PASO 3: Repositorios personales/directos de cada usuario
		// -------------------------------------------------------------
		console.log(
			"\n[PASO 3] Analizando repositorios individuales de cada usuario...",
		);
		for (const [gitlabUserId, localUserId] of usuariosMap.entries()) {
			console.log(
				`  -> Revisando proyectos de usuario GitLab ID: ${gitlabUserId}`,
			);

			let personalProjects = [];
			try {
				personalProjects = await obtenerTodosLosProyectosUser(gitlabUserId);
			} catch (err) {
				console.error(
					`  [!] Error al obtener repos del usuario ${gitlabUserId}:`,
					err.message,
				);
				continue;
			}

			for (const gitlabProj of personalProjects) {
				if (seenGitlabProjectIds.has(gitlabProj.id)) continue;

				seenGitlabProjectIds.add(gitlabProj.id);

				const localProjectId = await this._syncProjectStructure(
					gitlabProj,
					proyectosLocalesMap,
					null,
					counters,
				);

				if (localProjectId) {
					await this._syncProjectMemberships(
						gitlabProj.id,
						localProjectId,
						usuariosMap,
						new Map(),
						counters,
					);
				}
			}
		}

		// -------------------------------------------------------------
		// PASO 4: Limpieza de repositorios borrados en GitLab
		// -------------------------------------------------------------
		console.log(
			"\n[PASO 4] Iniciando recolección de basura de repositorios locales...",
		);

		for (const [idGitlab, idProyecto] of proyectosLocalesMap.entries()) {
			console.log(
				`  -> Verificando en GitLab el proyecto local ID: ${idProyecto} (idGitlab: ${idGitlab})...`,
			);

			const existsInGitlab = await checkProjectExists(idGitlab);

			if (!existsInGitlab) {
				try {
					console.log(
						`  [!] Borrado confirmado: El proyecto idGitlab ${idGitlab} ya no existe en el servidor. Eliminando de la BD local.`,
					);
					await this.deleteProyecto(idProyecto);
					counters.deletedCount++;
				} catch (err) {
					console.error(
						`  [!] Error al borrar el proyecto ${idProyecto} de la base de datos:`,
						err.message,
					);
				}
			} else {
				console.log(`     [OK] El proyecto sigue existiendo.`);
			}
		}

		console.log("\n[FIN] Sincronización completada con éxito.");
		return {
			created: counters.createdCount,
			updated: counters.updatedCount,
			deleted: counters.deletedCount,
			membershipChanges: counters.membershipChangesCount,
		};
	}

	static async _syncProjectStructure(
		gitlabProj,
		proyectosLocalesMap,
		idGrupoGitlab,
		counters,
	) {
		const gitlabProjectId = gitlabProj.id;
		const fechaInicio = gitlabProj.created_at
			? gitlabProj.created_at.split("T")[0]
			: new Date().toISOString().split("T")[0];
		const archived = gitlabProj.archived || false;

		let localProjectId = proyectosLocalesMap.get(gitlabProjectId);

		if (!localProjectId) {
			try {
				localProjectId = await this.createProyecto({
					idGitlab: gitlabProjectId,
					nombre: gitlabProj.name,
					descripcion: gitlabProj.description || "",
					fechaInicio,
					archived,
					idGrupoGitlab: idGrupoGitlab || null,
				});
				counters.createdCount++;
				console.log(`    [Creado] Proyecto: "${gitlabProj.name}"`);
				proyectosLocalesMap.set(gitlabProjectId, localProjectId);
			} catch (err) {
				console.error(
					`    [!] Error guardando proyecto ${gitlabProj.name}:`,
					err.message,
				);
				return null;
			}
		} else {
			let needsUpdate = false;
			const existing = await this.getProyectoByIdGitlab(gitlabProjectId);
			if (existing) {
				const localGroupId =
					existing.idgrupogitlab !== undefined
						? existing.idgrupogitlab
						: existing.idgrupo_gitlab;
				if (localGroupId !== idGrupoGitlab) {
					await this.updateProyectoGrupo(localProjectId, idGrupoGitlab);
					needsUpdate = true;
				}
				const localActivo =
					existing.activo !== undefined ? existing.activo : true;
				if (localActivo !== !archived) {
					await this.updateProyectoActivo(localProjectId, archived);
					needsUpdate = true;
				}
			}
			if (needsUpdate) {
				counters.updatedCount++;
				console.log(`    [Actualizado] "${gitlabProj.name}"`);
			}
		}
		return localProjectId;
	}

	static async _syncProjectMemberships(
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
			console.error(
				`    [!] Error consultando miembros explícitos del proyecto ${gitlabProjectId}:`,
				err.message,
			);
			return;
		}

		const finalGitlabMembers = new Map(groupMembersMap);
		projectMembers.forEach((m) => finalGitlabMembers.set(m.id, m.access_level));

		const localMemberIds = await this.getMiembrosByProyecto(localProjectId);
		const expectedLocalMemberIds = new Set();

		for (const [memberGitlabId, accessLevel] of finalGitlabMembers.entries()) {
			const localUserId = usuariosMap.get(memberGitlabId);
			if (localUserId) {
				expectedLocalMemberIds.add(localUserId);
				const role = this.mapAccessLevelToRole(accessLevel);
				try {
					await this.upsertParticipa(localUserId, localProjectId, role);
					counters.membershipChangesCount++;
				} catch (err) {
					console.error(
						`    [!] Error guardando relación (User: ${localUserId}, Repo: ${localProjectId}):`,
						err.message,
					);
				}
			}
		}

		for (const localMemberId of localMemberIds) {
			if (!expectedLocalMemberIds.has(localMemberId)) {
				try {
					await this.deleteParticipa(localMemberId, localProjectId);
					counters.membershipChangesCount++;
					console.log(
						`    [Removido] Miembro local ID ${localMemberId} ya no participa.`,
					);
				} catch (err) {
					console.error(
						`    [!] Error al eliminar membresía del ID ${localMemberId}:`,
						err.message,
					);
				}
			}
		}
	}
}

export default GitlabModel;
