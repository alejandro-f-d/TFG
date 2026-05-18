import GitlabModel from "../models/gitlabModel.js";

export async function runGitlabSync() {
	console.log("[SYNC] Iniciando sincronización con GitLab...");
	const result = await GitlabModel.syncAllProjectsFromUsers();
	console.log("[SYNC] Finalizada:", result);
	return result;
}
