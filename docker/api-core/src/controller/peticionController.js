import { QUEUE_DOCUMENTS } from "../eda/constants.js";
import { addPdfToQueue } from "../eda/queue.js";
import PeticionModel from "../models/peticionModel.js";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import FormData from "form-data";
import { addEmailToQueue } from "../eda/queue.js";

export const validarFirmaDSS = async (file, name) => {
	// 1. Verificación de archivo recibido
	if (!file) {
		throw new Error("No hay fichero");
	}

	const pdfBase64 = file.buffer.toString("base64");

	const dssUrl = process.env.DSS_URL;

	const dssResponse = await axios.post(
		`${dssUrl}/services/rest/validation/validateSignature`,
		{
			signedDocument: {
				bytes: pdfBase64,
				name: name,
			},
			tokenExtractionStrategy: "NONE",
		},
		{
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
			timeout: 60000,
		},
	);

	const data = dssResponse.data;

	const simpleSignatures =
		data.SimpleReport?.signatureOrTimestampOrEvidenceRecord || [];
	const detailedSignatures =
		data.DetailedReport?.signatureOrTimestampOrEvidenceRecord || [];

	const soloFirmasSimple = simpleSignatures.filter((item) => item.Signature);
	const soloFirmasDetailed = detailedSignatures.filter(
		(item) => item.Signature,
	);

	if (soloFirmasSimple.length === 0) {
		return res.status(422).json({
			error: "El documento no contiene ninguna firma electrónica reconocida.",
			detalles: "Asegúrese de que el PDF esté firmado digitalmente (PAdES).",
		});
	}

	const ultimaFirmaSimple =
		soloFirmasSimple[soloFirmasSimple.length - 1].Signature;
	const ultimaFirmaDetailed =
		soloFirmasDetailed[soloFirmasDetailed.length - 1].Signature;

	const metadatos = {
		firmante: ultimaFirmaSimple.SignedBy || "No identificado",
		fecha_firma: ultimaFirmaSimple.SigningTime,
		indicacion: ultimaFirmaSimple.Indication, // Ej: TOTAL_PASSED, INDETERMINATE
		sub_indicacion: ultimaFirmaSimple.SubIndication, // Ej: NO_CERTIFICATE_CHAIN_FOUND
		nivel: ultimaFirmaSimple.SignatureLevel, // Ej: PAdES-B-B

		// El emisor del certificado (normalmente FNMT, DNIe, etc.)
		emisor:
			ultimaFirmaSimple.CertificateChain?.[0]?.IssuerName ||
			"Emisor desconocido",

		detalles_tecnicos: {
			filtro: ultimaFirmaDetailed.PDFSignatureDictionary?.Filter || "N/A",
			subfiltro: ultimaFirmaDetailed.PDFSignatureDictionary?.SubFilter || "N/A",
			byte_range: ultimaFirmaDetailed.PDFSignatureDictionary?.ByteRange || [],
		},
		veredicto: {
			conclusion: ultimaFirmaDetailed.Conclusion?.Indication || "N/A",
			warnings: ultimaFirmaDetailed.Conclusion?.Warnings || [],
		},
	};
	return metadatos;
};

const tienePermisoVisualizacion = async (userId, peticionUuid, permisos) => {
	if (!userId) return 1; // 403

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(peticionUuid)) return 2;

	if (
		permisos.includes("admin:total") ||
		permisos.includes("peticion:listar_todo")
	) {
		return 0;
	}

	if (permisos.includes("peticion:revisor")) {
		const esSuResponsable = await PeticionModel.verificarPermiso(
			userId,
			peticionUuid,
			true,
		);
		if (esSuResponsable === 0) return 0; // Éxito
		if (esSuResponsable === 2) return 2; // Not found
	}

	const esElCreador = await PeticionModel.verificarPermiso(
		userId,
		peticionUuid,
		false,
	);

	if (esElCreador === 0) return 0;
	if (esElCreador === 2) return 2;

	return 1;
};

export const postPeticion = async (req, res) => {
	const {
		nombreProyectoAsociado,
		servidorAsociado,
		tareasServidor,
		prioridadTarea,
		momentoEjecucion,
		nombreServicioAsociado,
	} = req.body;

	if (
		!nombreProyectoAsociado ||
		!servidorAsociado ||
		!tareasServidor ||
		!prioridadTarea ||
		!momentoEjecucion ||
		!nombreServicioAsociado
	) {
		return res
			.status(400)
			.json({ error: "Petición mal formada. Faltan campos obligatorios." });
	}

	try {
		const datosParaWorker = await PeticionModel.postPeticion(
			req.body,
			req.user?.uuidUsuario,
		);

		if (typeof datosParaWorker === "number") {
			const errores = {
				1: "Usuario solicitante no encontrado.",
				2: "Un responsable/supervisor no puede realizar esta petición.",
				3: "Responsable asociado no encontrado.",
				4: "Momento de ejecución no válido.",
				5: "Prioridad de la tarea no válido.",
			};
			return res
				.status(403)
				.json({ error: errores[datosParaWorker] || "Operación no permitida." });
		}
		// console.log(datosParaWorker);

		await addPdfToQueue({
			...datosParaWorker,
			solicitante: datosParaWorker.nombreCompleto,
			email: datosParaWorker.correoInstitucional,
			supervisor: datosParaWorker.nombreSupervisor,
			fecha: datosParaWorker.fechaSolicitud,
			servidores: datosParaWorker.servidoresNombres,
			proyecto: datosParaWorker.nombreProyectoAsociado,

			recursos: {
				cpu: datosParaWorker.cpuSolicitada,
				ram: datosParaWorker.ram,
				disco: datosParaWorker.disco,
				gpu: datosParaWorker.gpuSolicitada,
			},

			tareas: datosParaWorker.tareasServidor,
			docker: datosParaWorker.docker,
			finNecesidadServicio: datosParaWorker.fechaFin,
			prioridadTarea: datosParaWorker.prioridadTarea,
			momentoEjecucion: datosParaWorker.momentoEjecucion,
			idPeticion: datosParaWorker.idPeticion,
			uuid: datosParaWorker.uuid,
			linkPeticion: `${process.env.WEB_URL}${datosParaWorker.uuid}`,
		});

		return res
			.status(201)
			.location(`/api/peticion/${datosParaWorker.uuid}`)
			.json({
				message:
					"Petición registrada correctamente. El documento PDF se está generando.",
				uuidPeticion: datosParaWorker.uuid,
				url: `${process.env.API_DIRECTION}/api/peticion/${datosParaWorker.uuid}`,
			});
	} catch (error) {
		console.error(
			"Se ha producido un error al hacer post para una petición.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getPeticion = async (req, res) => {
	const { uuid } = req.params;
	try {
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1)
			return res.status(403).json({ error: "No tienes permiso" });
		if (codigoPermiso === 2)
			return res.status(404).json({ error: "Petición no encontrada" });

		const resGetPeticion = await PeticionModel.getPeticionByUuid(uuid);
		if (resGetPeticion === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}
		return res.status(200).json({
			message: "Petición encontrada con éxito.",
			info: resGetPeticion,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al intentar obtener los datos de una petición.",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getDocumentoPeticion = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: "Solicitud mal formada." });
	}
	try {
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1)
			return res.status(403).json({ error: "No tienes permiso" });
		if (codigoPermiso === 2)
			return res.status(404).json({ error: "Petición no encontrada" });

		const resGetUuidDoc = await PeticionModel.getUuidDoc(uuid);
		if (resGetUuidDoc === 2) {
			return res.status(404).json({ error: `Documento no encontrado.` });
		}
		// console.log("El uuid del documento es:", resGetUuidDoc.uuidDocumento);
		const respuestaStorage = await axios.get(
			`${process.env.STORAGE_URL}/download/${resGetUuidDoc.uuidDocumento}`,
			{
				responseType: "arraybuffer",
			},
		);
		// Establecemos que el tipo que se devuelve es un documento pdf.
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${resGetUuidDoc.nombre}.pdf"`,
		);
		res.send(respuestaStorage.data);
	} catch (error) {
		console.error(
			"Se ha producido un error al intentar realizar un get de la documentación.",
			error,
		);
		if (error.response?.status === 404) {
			return res
				.status(404)
				.json({ message: "El archivo no existe en Storage" });
		}
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const getAllPeticiones = async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 5;
	const filtroNombre = req.query.filtroNombre || "";
	const status = req.query.status || "";
	if (page < 1 || limit < 1) {
		return res.status(400).json({ error: "Petición invalida" });
	}

	try {
		let resultado;
		if (
			req.user.permisos.includes("admin:total") ||
			req.user.permisos.includes("peticion:listar_todo")
		) {
			resultado = await PeticionModel.getAllPeticiones(
				page,
				limit,
				filtroNombre,
				status,
				true,
				null,
			);
		} else if (req.user.permisos.includes("peticion:revisor")) {
			resultado = await PeticionModel.getAllPeticiones(
				page,
				limit,
				filtroNombre,
				status,
				false,
				req.user.idUsuario,
			);
		} else {
			return res
				.status(403)
				.json({ error: "No tienes los permisos necesarios." });
		}
		if (resultado === 2) {
			return res.status(400).json({
				message: `No se han encontrado usuarios que coincidan con: ${filtroNombre}`,
			});
		}
		return res.status(200).json({
			message: "Lista de proyectos de gitlab devuelta correctamente.",
			info: resultado,
			// pagination: resultado.pagination,
		});
	} catch (error) {
		console.error(
			"Se ha producido un error al obtener el listado de todas las peticiones",
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const procesarFirmaPorRol = async (req, res) => {
	const { uuid } = req.params;

	if (!uuid) {
		return res.status(400).json({ error: "Petición mal formada." });
	}

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid)) {
		return res
			.status(400)
			.json({ error: "UUID de la petición en formato inválido." });
	}

	if (!req.file) {
		return res
			.status(400)
			.json({ error: "No se ha recibido el PDF en 'documentoPdf'." });
	}

	try {
		const estadoActualPeticion = await PeticionModel.getEstadoPeticion(uuid);
		if (estadoActualPeticion === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}
		if (estadoActualPeticion === "DENEGADA") {
			return res
				.status(304)
				.json({ message: "La petición ya se encuentra denegada." });
		} else if (estadoActualPeticion === "REALIZADA") {
			return res
				.status(304)
				.json({ message: "La petición ya está marcada como realizada" });
		}
		//  Antes de atacar al servidor y verificar integridad de las firmas, documento, ...
		// Lo que hacemos es verificar si para ese determinado usuario ha realizado el envío del documento firmado.
		const permisos = req.user?.permisos; //req.user?.permisos
		const userId = req.user.idUsuario;
		if (
			!permisos.includes("peticion:revisor") &&
			!permisos.includes("admin:total") &&
			!permisos.includes("peticion:firma_administrador")
		) {
			// Se trata del usuario base, este usuario solo puede hacerlo si se trata del userId creador de la petición.
			const esCreadorPeticion = await PeticionModel.esUserCreador(uuid, userId);
			if (esCreadorPeticion == 2) {
				return res.status(404).json({ error: "Petición no encontrada." });
			}
			if (!esCreadorPeticion) {
				return res.status(403).json({
					error:
						"No tienes los permisos necesarios o ya has realizado la firma.",
				});
			}
		} else if (
			permisos.includes("peticion:revisor") &&
			!permisos.includes("admin:total")
		) {
			// console.log("Entro aqui 2.");
			// En este caso debemos validar de que sea revisor de dicha solicitud.
			const esSupervisorPeticion = await PeticionModel.esEncargado(
				uuid,
				userId,
			);
			if (esSupervisorPeticion === 2) {
				return res.status(404).json({ error: "Petición no encontrada." });
			}
			if (!esSupervisorPeticion) {
				return res.status(403).json({
					error:
						"No tienes los permisos necesarios o ya has realizado la firma.",
				});
			}
		} // En cualquiera de los otros dos casos puede ver todas las peticiones o modificarlas al gusto.
		const metadatos = await validarFirmaDSS(req.file, req.file.originalname);

		if (metadatos.indicacion === "TOTAL_PASSED") {
			const infoDoc = await PeticionModel.getUuidDoc(uuid);
			const form = new FormData();

			form.append("pdf", req.file.buffer, {
				filename: req.file.originalname,
				contentType: "application/pdf",
			});
			const response = await axios.patch(
				`${process.env.STORAGE_URL}/${infoDoc.uuidDocumento}`,
				form,
				{
					headers: {
						...form.getHeaders(), // Generamos los headers correspondientes para el envio con el form.
					},
					maxContentLength: Infinity,
					maxBodyLength: Infinity,
				},
			);

			let nivelFirma = 0;
			// PET_AVISO => Template de correo electronico.

			if (
				permisos.includes("admin:total") ||
				permisos.includes("peticion:firma_administrador")
			) {
				nivelFirma = 3; // Firma de Administración / Jefe
				// Correo electrónico al usuario y supervisorCorrespondiente. Se saca en base del uuidPeticion.
				const correosImplicados =
					await PeticionModel.obtenerCorreoUsuarioSupervisor(uuid);
				await addEmailToQueue({
					template: "PET_APROBADA",
					to: correosImplicados,
				});
			}

			if (permisos.includes("peticion:revisor")) {
				nivelFirma = 2; // Firma Técnica / Revisor
				const correosJefes = await PeticionModel.obtenerListaJefesLaboratorio();
				await addEmailToQueue({
					template: "PET_AVISO",
					to: correosJefes,
				});
			} else if (
				!permisos.includes("admin:total") ||
				!permisos.includes("peticion:firma_administrador")
			) {
				// Esta estructura tan extraña se sigue para que en caso de que un usuario sea jefe y responsable se le validen automáticamente las dos revisiones.
				nivelFirma = 1; // Firma de Solicitante
				const correoSupervisor =
					await PeticionModel.obtenerCorreoSupervisor(userId);
				// console.log("El correo del supervisor es:", correoSupervisor);
				await addEmailToQueue({
					template: "PET_AVISO",
					to: correoSupervisor,
				});
			}
			await PeticionModel.setFirmado(uuid, nivelFirma);

			return res.status(201).json({
				success: true,
				message: "Documento íntegro y firma válida",
				metadatos,
			});
		} else {
			// Si es INDETERMINATE o TOTAL_FAILED
			return res.status(422).json({
				success: false,
				error:
					"La validación de la firma no ha podido completarse satisfactoriamente.",
				motivo: metadatos.sub_indicacion || "Desconocido",
				metadatos,
			});
		}
	} catch (error) {
		console.error("ERROR EN PROCESAR_FIRMA_POR_ROL:", error);
		if (error.response) {
			console.error("Detalle error DSS:", JSON.stringify(error.response.data));
		} else {
			console.error(error.message);
		}

		return res.status(500).json({
			error: "Error interno al procesar la firma electrónica.",
			detalle: error.message,
		});
	}
};

export const denegarPeticion = async (req, res) => {
	const { uuid } = req.params;
	const { razonDenegada } = req.body;
	const permisos = req.user?.permisos; //req.user?.permisos
	if (!razonDenegada) {
		return res.status(400).json({ error: "Petición mal formada." });
	}
	try {
		const permisosPermitidos = [
			"admin:total",
			"peticion:firma_administrador",
			"peticion:revisor",
		];

		if (!req.user.permisos.some((p) => permisosPermitidos.includes(p))) {
			return res.status(403).json({
				error: "No tienes permiso para denegar una petición.",
			});
		}
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1)
			return res.status(403).json({ error: "No tienes permiso" });
		if (codigoPermiso === 2)
			return res.status(404).json({ error: "Petición no encontrada" });
		// Esta sería la lógica de denegar el servicio. En este punto tienePermisoVisualizacion ha validado que el supervisor tiene relacion con esa petición.

		const estadoActualPeticion = await PeticionModel.getEstadoPeticion(uuid);
		if (estadoActualPeticion === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}
		if (estadoActualPeticion === "DENEGADA") {
			return res
				.status(304)
				.json({ message: "La petición ya se encuentra denegada." });
		} else if (estadoActualPeticion === "REALIZADA") {
			return res
				.status(304)
				.json({ error: "La petición está marcada como realizada." });
		}
		await PeticionModel.denegarPeticion(uuid, razonDenegada);

		let destinatarios = "";

		if (
			permisos.includes("admin:total") ||
			permisos.includes("peticion:firma_administrador")
		) {
			// Caso Admin: Notificar a ambos
			destinatarios = await PeticionModel.obtenerCorreoUsuarioSupervisor(uuid);
		} else {
			// Caso Revisor: Solo al creador
			destinatarios =
				await PeticionModel.obtenerCorreoInstitucionalUserCreador(uuid);
		}
		await addEmailToQueue({
			template: "PET_DENEGADA",
			to: destinatarios,
			reason: razonDenegada,
		});
		return res.status(204).send();
	} catch (error) {
		console.error(
			"Se ha producido un error al denegar una petición.",
			uuid,
			error,
		);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};

export const peticionRealizada = async (req, res) => {
	const { uuid } = req.params;
	if (!uuid) {
		return res.status(400).json({ error: `Petición mal formada.` });
	}
	try {
		const estadoActualPeticion = await PeticionModel.getEstadoPeticion(uuid);
		if (estadoActualPeticion === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}
		if (estadoActualPeticion === "DENEGADA") {
			return res
				.status(304)
				.json({ message: "La petición ya se encuentra denegada." });
		} else if (estadoActualPeticion === "REALIZADA") {
			return res
				.status(204)
				.json({ message: "Petición marcada como REALIZADA correctamente." });
		}
		const updatePeticion = await PeticionModel.establecerRealizada(uuid);
		if (updatePeticion.status === "OK") {
			return res
				.status(204)
				.json({ message: "Petición marcada como REALIZADA correctamente." });
		}
	} catch (error) {
		console.error(
			"Se ha producido un error al marcar como completada una petición",
			error,
		);
		return res.status(500).json({ error: `Error interno del servidor.` });
	}
};
