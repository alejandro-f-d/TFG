import { QUEUE_DOCUMENTS } from "../eda/constants.js";
import { addPdfToQueue } from "../eda/queue.js";
import PeticionModel from "../models/peticionModel.js";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import FormData from "form-data";
import { addEmailToQueue } from "../eda/queue.js";

async function procesarNotificaciones(uuid, userId, nivelFirma) {
	try {
		if (nivelFirma === 3) {
			const tos = await PeticionModel.obtenerCorreoUsuarioSupervisor(uuid);
			await addEmailToQueue({ template: "PET_APROBADA", to: tos });
		} else if (nivelFirma === 2) {
			const tos = await PeticionModel.obtenerListaJefesLaboratorio();
			await addEmailToQueue({ template: "PET_AVISO", to: tos });
		} else if (nivelFirma === 1) {
			const to = await PeticionModel.obtenerCorreoSupervisor(userId);
			await addEmailToQueue({ template: "PET_AVISO", to });
		}
	} catch (err) {
		console.error("Error enviando notificaciones:", err.message);
	}
}

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
		return 422;
	}
	// Validación de que la primera firma es la del servidor. Con el serial y con el nombre.
	const firmaServidorSimple = soloFirmasSimple[0].Signature;
	const firmaServidorDetailed = soloFirmasDetailed[0].Signature;

	const nombreFirmante = firmaServidorSimple.SignedBy || "";
	console.log("Datos de la firma:", firmaServidorSimple.CertificateChain);
	const serialNumber =
		firmaServidorDetailed.CertificateChain?.[0]?.SerialNumber || "";

	const tieneNombreCorrecto = nombreFirmante.includes(process.env.COMMON_NAME);
	const tieneSerialCorrecto =
		serialNumber.toLowerCase() === process.env.SERIAL.toLowerCase();
	console.log("El log del indication es:", firmaServidorSimple.Indication);

	const esIntegridadValida = ["TOTAL_PASSED", "INDETERMINATE"].includes(
		firmaServidorSimple.Indication,
	);

	if (!tieneNombreCorrecto) {
		return 3;
	}

	if (!esIntegridadValida) {
		return 4;
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
		return res
			.status(400)
			.json({ error: "Solicitud mal formada: falta el UUID." });
	}

	try {
		const codigoPermiso = await tienePermisoVisualizacion(
			req.user.idUsuario,
			uuid,
			req.user.permisos,
		);

		if (codigoPermiso === 1) {
			return res
				.status(403)
				.json({ error: "No tienes permisos para visualizar este documento." });
		}
		if (codigoPermiso === 2) {
			return res.status(404).json({ error: "Petición no encontrada." });
		}

		const documento = await PeticionModel.getUuidDoc(uuid);

		if (documento === 2 || !documento?.uuidDocumento) {
			return res
				.status(404)
				.json({ error: "Documento no registrado en la petición." });
		}

		try {
			const respuestaStorage = await axios.get(
				`${process.env.STORAGE_URL}/download/${documento.uuidDocumento}`,
				{ responseType: "arraybuffer" },
			);

			res.setHeader("Content-Type", "application/pdf");
			res.setHeader(
				"Content-Disposition",
				`inline; filename="${documento.nombre || "documento"}.pdf"`,
			);

			return res.send(respuestaStorage.data);
		} catch (storageError) {
			if (storageError.response?.status === 404) {
				return res
					.status(404)
					.json({ error: "El archivo físico no existe en el almacenamiento." });
			}
			throw storageError; // Re-lanzar para que lo capture el catch principal
		}
	} catch (error) {
		console.error("Error en getDocumentoPeticion:", {
			uuid,
			userId: req.user?.idUsuario,
			msg: error.message,
		});

		return res
			.status(500)
			.json({ error: "Error interno al recuperar el documento." });
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
			// Obtener las peticiones del usuario en cuestión.
			resultado = await PeticionModel.getPeticionesPropias(
				page,
				limit,
				filtroNombre,
				status,
				req.user.idUsuario,
			);
			if (resultado === 2) {
				return res
					.status(404)
					.json({ error: "No se ha encontrado ninguna petición." });
			}
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
	const { file, user } = req;

	// 1. Validaciones de entrada
	if (!uuid) return res.status(400).json({ error: "Petición mal formada." });

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(uuid))
		return res.status(400).json({ error: "UUID en formato inválido." });

	if (!file)
		return res.status(400).json({ error: "No se ha recibido el PDF." });

	try {
		// 2. Comprobación de estado de la petición
		const estado = await PeticionModel.getEstadoPeticion(uuid);
		if (estado === 2)
			return res.status(404).json({ error: "Petición no encontrada." });

		const estadosInvalidos = {
			DENEGADA: "La petición ya se encuentra denegada.",
			REALIZADA: "La petición ya está marcada como realizada.",
		};
		if (estadosInvalidos[estado])
			return res.status(304).json({ message: estadosInvalidos[estado] });

		// 3. Lógica de Niveles de Firma y Autorización
		const permisos = user?.permisos || [];
		const userId = user.idUsuario;
		let nivelFirma = 0;

		const isAdmin =
			permisos.includes("admin:total") ||
			permisos.includes("peticion:firma_administrador");
		const isRevisor = permisos.includes("peticion:revisor");

		if (isAdmin) {
			nivelFirma = 3;
		} else if (isRevisor) {
			const esEncargado = await PeticionModel.esEncargado(uuid, userId);
			if (esEncargado === 2)
				return res.status(404).json({ error: "Petición no encontrada." });
			if (!esEncargado)
				return res
					.status(403)
					.json({ error: "No eres el revisor asignado o ya has firmado." });
			nivelFirma = 2;
		} else {
			const esCreador = await PeticionModel.esUserCreador(uuid, userId);
			if (esCreador === 2)
				return res.status(404).json({ error: "Petición no encontrada." });
			if (!esCreador)
				return res
					.status(403)
					.json({ error: "No tienes permisos o ya has firmado." });
			nivelFirma = 1;
		}

		// 4. Validación de Firma Electrónica (DSS)
		const metadatos = await validarFirmaDSS(file, file.originalname);

		if (metadatos === 3)
			return res.status(422).json({ error: "CN no es válido." });
		if (metadatos === 4)
			return res
				.status(422)
				.json({ error: "Error de integridad del documento." });

		if (metadatos.indicacion !== "TOTAL_PASSED") {
			return res.status(422).json({
				success: false,
				error: "Validación de firma fallida.",
				motivo: metadatos.sub_indicacion || "Firma no válida",
				metadatos,
			});
		}

		const infoDoc = await PeticionModel.getUuidDoc(uuid);
		const form = new FormData();
		form.append("pdf", file.buffer, {
			filename: file.originalname,
			contentType: "application/pdf",
		});

		await axios.patch(
			`${process.env.STORAGE_URL}/${infoDoc.uuidDocumento}`,
			form,
			{
				headers: form.getHeaders(),
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
			},
		);

		await PeticionModel.setFirmado(uuid, nivelFirma);
		await PeticionModel.addMetadata(metadatos, uuid, nivelFirma);

		await procesarNotificaciones(uuid, userId, nivelFirma);

		if (nivelFirma === 3) {
			// Marcamos la solicitud como completada.
			await PeticionModel.establecerRealizada(uuid);
		}
		return res.status(201).json({
			success: true,
			message: "Documento actualizado y firma registrada correctamente.",
			metadatos,
		});
	} catch (error) {
		console.error(
			"ERROR EN PROCESAR_FIRMA_POR_ROL:",
			error.response?.data || error.message,
		);
		return res
			.status(500)
			.json({ error: "Error interno al procesar la firma." });
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
export const getMomentoEjecucion = async (req, res) => {
	try {
		const data = await PeticionModel.getMomentosEjecucion();

		return res.status(200).json({
			message: "Información de ejecución obtenida con éxito",
			momentos: data.momentos || [],
			prioridades: data.prioridades || [],
		});
	} catch (error) {
		console.error("Error en el controlador de momentos de ejecución:", error);
		return res.status(500).json({ error: "Error interno del servidor." });
	}
};
