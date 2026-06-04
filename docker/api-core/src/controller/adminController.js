import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { queuesForDashboard } from "../eda/queue.js";

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// 2. Inicializamos el board una sola vez
createBullBoard({
	queues: queuesForDashboard.map((queue) => new BullMQAdapter(queue)),
	serverAdapter: serverAdapter,
});
