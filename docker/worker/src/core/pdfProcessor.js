import PDFDocument from "pdfkit";
import axios from "axios";
import FormData from "form-data";
import path from "path";
import PdfModel from "../models/pdfModel.js";
import { addEmailToQueue } from "../eda/queue.js";

export const pdfProcessor = async (job) => {
	const {
		solicitante,
		email,
		supervisor,
		proyecto,
		servidores,
		necesidadServidor,
		tareas,
		recursos,
		prioridad,
		docker,
		sistemaOperativo,
		tiempoEstimadoTarea,
		fecha,
		prioridadTarea,
		momentoEjecucion,
		finNecesidadServicio,
		idPeticion,
		uuid,
		linkPeticion,
	} = job.data;

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50 });
		let buffers = [];
		const logoPath = path.resolve("src/assets/logo.png");

		doc.on("data", buffers.push.bind(buffers));
		doc.on("end", async () => {
			try {
				const pdfBuffer = Buffer.concat(buffers);

				const form = new FormData();
				const iniciales = solicitante
					.split(" ")
					.map((word) => word[0])
					.join("")
					.toUpperCase();

				const fechaHoy = new Date().toISOString().split("T")[0];

				const fileName = `SAR_${iniciales}_${fechaHoy}.pdf`;

				form.append("pdf", pdfBuffer, {
					filename: fileName,
					contentType: "application/pdf",
				});
				const { data } = await axios.post(
					`${process.env.STORAGE_URL}/upload`,
					form,
					{
						headers: form.getHeaders(),
					},
				);
				const resUpdateDoc = await PdfModel.updateUuidDocument(
					idPeticion,
					data.uuid,
				);

				addEmailToQueue({
					template: "FORM_SOL",
					to: email,
					linkPeticion: linkPeticion,
				});

				resolve(data);
			} catch (err) {
				console.error("Error subiendo PDF al storage:", err.message);
				reject(err);
			}
		});
		try {
			doc.image(logoPath, 50, 45, { width: 60 });
		} catch (e) {
			console.warn("No se pudo cargar el logo, continuando sin él...");
		}

		doc.fontSize(20).text("MEDAL", { align: "center" });
		doc
			.fontSize(10)
			.text("Medical Data Analytics Laboratory", { align: "center" });
		doc.moveDown();
		doc
			.fontSize(10)
			.text(
				"This document is intended to collect the necessary information for requesting access to the laboratory's servers. Both the applicant and their supervisor must review and provide the requested details. By signing this document, the applicant agrees to comply with all server usage policies, including security and resource management guidelines. The supervisor confirms their responsibility for overseeing the applicant's proper use of the server resources. Please ensure all information is accurate and complete before submission.",
				{ align: "center" },
			);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("User and application information", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(`Name and surname: ${solicitante}`);
		doc.text(`Email: ${email}`);
		doc.text(`Supervisor: ${supervisor}`);
		doc.text(`Application date: ${new Date(fecha).toLocaleDateString()}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Application information", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(`Associated project: ${proyecto}`);
		doc.text(`Selected server: ${servidores}`);
		doc.text(`Description of server need: ${necesidadServidor || "N/A"}`);
		doc.text(`Tasks to be carried out: ${tareas}`);
		doc.text(`Task priority: ${prioridadTarea}`);
		doc.text(`End of Server Necesity: ${finNecesidadServicio || "N/A"}`);
		doc.text(`Moment of Execution: ${momentoEjecucion}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Required resources", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(
			`CPUs: ${recursos.cpu} | GPU: ${recursos.gpu} | RAM: ${recursos.ram} | Disco: ${recursos.disco}`,
		);
		doc.text(`Priority: ${prioridad}`);
		doc.text(`Expected execution time: ${tiempoEstimadoTarea}`);
		doc.text(`Software/OS requirements: ${sistemaOperativo}`);
		doc.text(`Docker image: ${docker}`);
		doc.text(`Identificador del recurso: ${uuid}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Declaration of Truthfulness", { underline: true });
		doc.fillColor("black").fontSize(9).moveDown(0.5);

		doc.text(
			"By submitting this form, the user declares that all information is truthful. Failure to comply with terms may result in termination of access and services provided by MEDAL Laboratory.\nAdditionally, the user accepts the terms of use outlined on the website ",
			{ continued: true },
		);

		doc.fillColor("blue").text("https://bit.ly/MEDAL_Servers_TaC", {
			link: "https://bit.ly/MEDAL_Servers_TaC",
			underline: true,
			continued: true,
		});

		doc
			.fillColor("black")
			.text(
				", which they acknowledge having read and understood. Failure to comply with these terms may result in the automatic termination of access to the servers and services provided by MEDAL Laboratory.",
				{
					link: null,
					underline: false,
				},
			);

		doc.moveDown(2);

		const currentY = doc.y;
		doc.lineCap("butt").moveTo(50, currentY).lineTo(250, currentY).stroke();
		doc.lineCap("butt").moveTo(350, currentY).lineTo(550, currentY).stroke();

		doc.text("Applicant Signature", 50, currentY + 10, {
			width: 200,
			align: "center",
		});
		doc.text("Supervisor Signature", 350, currentY + 10, {
			width: 200,
			align: "center",
		});

		doc.end();
	});
};
