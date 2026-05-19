import GitlabModel from "../models/gitlabModel.js";

export async function runGitlabSync() {
	console.log("[SYNC] Iniciando sincronización con GitLab...");
	const result = await GitlabModel.syncAllProjectsFromUsers();
	console.log("[SYNC] Finalizada:", result);
	return result;
}

export const gitlabQueueProcessor = async (job) => {
	if (job.name === "recargar-gitlab") {
		console.log("Se empieza a resincronizar el gitlab");
		await runGitlabSync();
		console.log("Fin de resincronizar gitlab.");
	}
};
