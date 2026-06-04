import pool from "../bbdd/conexion.js";
import { PDFQUERY } from "../querys/pdfQuery.js";
class PdfModel {
	static async updateUuidDocument(idPet, uuidDoc) {
		try {
			await pool.query(PDFQUERY.UPDATE_UUID_DOCUMENT, [uuidDoc, idPet]);
			return { status: "OK" };
		} catch (error) {
			console.error(
				"Se ha producido un error al hacer el update de un uuid de un documento de firmas.",
				error,
			);
			return { status: "Error" };
		}
	}
}
export default PdfModel;
