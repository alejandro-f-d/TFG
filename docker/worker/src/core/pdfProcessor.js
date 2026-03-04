import PDFDocument from "pdfkit";
import axios from "axios";
import FormData from "form-data";

export const pdfProcessor = async (job) => {
	const {
		nombreCompleto,
		correoInstitucional,
		nombreSupervidor,
		nombreProyectoAsociado,
		servidorAsociado,
		necesidadServidor,
		tareasServidor,
		cpusolicitada,
		gpusolicitada,
		prioridadtarea,
		docker,
		sistemaoperativo,
		comentariosadicionales,
		tiempoestimadotarea,
		nombreaccesonativo,
		disco,
		ram,
		momentoEjecucion,
	} = job.data;

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50 });
		let buffers = [];

		doc.on("data", buffers.push.bind(buffers));
		doc.on("end", async () => {
			try {
				const pdfBuffer = Buffer.concat(buffers);

				const form = new FormData();
				const fileName = `Server_access_request_${nombreCompleto.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

				form.append("pdf", pdfBuffer, {
					filename: fileName,
					contentType: "application/pdf",
				});

				const response = await axios.post(
					"http://medal-storage:3001/upload",
					form,
					{
						headers: form.getHeaders(),
					},
				);

				resolve(response.data);
			} catch (err) {
				reject(err);
			}
		});

		doc.fontSize(20).text("MEDAL", { align: "center" });
		doc
			.fontSize(10)
			.text("Medical Data Analytics Laboratory", { align: "center" });
		doc.moveDown();
		doc
			.fontSize(10)
			.text(
				"This document is intended to collect the necessary information for requesting access to the laboratory's servers.",
				{ align: "center" },
			);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("User and application information", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(`Name and surname: ${nombreCompleto}`);
		doc.text(`Email: ${correoInstitucional}`);
		doc.text(`Supervisor: ${nombreSupervidor}`);
		doc.text(`Application date: ${new Date().toLocaleDateString()}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Application information", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(`Associated project: ${nombreProyectoAsociado}`);
		doc.text(`Selected server: ${servidorAsociado}`);
		doc.text(`Description of server need: ${necesidadServidor}`);
		doc.text(`Tasks to be carried out: ${tareasServidor}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Required resources", { underline: true });
		doc.fillColor("black").fontSize(10).moveDown(0.5);
		doc.text(
			`CPUs: ${cpusolicitada} | GPU: ${gpusolicitada} | RAM: ${ram} | Disco: ${disco}`,
		);
		doc.text(`Priority: ${prioridadtarea}`);
		doc.text(`Expected execution time: ${tiempoestimadotarea}`);
		doc.text(`Software/OS requirements: ${sistemaoperativo}`);
		doc.text(`Docker image: ${docker}`);
		doc.moveDown();

		doc
			.fontSize(12)
			.fillColor("#2c3e50")
			.text("Declaration of Truthfulness", { underline: true });
		doc.fillColor("black").fontSize(9).moveDown(0.5);
		doc.text(
			"By submitting this form, the user declares that all information is truthful. Failure to comply with terms may result in termination of access.",
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
