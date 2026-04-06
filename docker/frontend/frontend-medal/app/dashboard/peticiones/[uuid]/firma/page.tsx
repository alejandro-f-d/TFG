"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { logout } from "@/lib/auth-common";

export default function FirmaDocumentoPage() {
	const router = useRouter();
	const { uuid } = useParams(); // Obtenemos el UUID de la URL
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<{
		type: "success" | "error" | null;
		msg: string;
	}>({ type: null, msg: "" });
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];
			if (selectedFile.type !== "application/pdf") {
				setStatus({ type: "error", msg: "El archivo debe ser un PDF válido." });
				return;
			}
			setFile(selectedFile);
			setStatus({ type: null, msg: "" });
		}
	};

	const uploadFirma = async () => {
		if (!file) return;
		setLoading(true);
		setStatus({ type: null, msg: "" });

		const formData = new FormData();
		formData.append("documentoPdf", file);

		try {
			const token = localStorage.getItem("token");
			if (!token) return logout();

			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			const res = await fetch(`${baseUrl}/api/peticion/${uuid}/firma`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData, // Importante: No poner Content-Type manual con FormData
			});

			const data = await res.json();

			if (res.status === 201) {
				setStatus({
					type: "success",
					msg: "Documento validado y firma procesada correctamente.",
				});
				// Redirigir tras 2 segundos para que el usuario vea el éxito
				setTimeout(() => router.push(`/dashboard/peticiones/${uuid}`), 2000);
			} else if (res.status === 422) {
				setStatus({
					type: "error",
					msg: `Validación fallida: ${data.motivo || "Firma no válida"}`,
				});
			} else {
				setStatus({
					type: "error",
					msg: data.error || "Error al procesar la firma.",
				});
			}
		} catch (e) {
			setStatus({
				type: "error",
				msg: "Error de conexión con el servidor de firmas.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center py-12 px-8 font-sans">
			<div className="max-w-3xl w-full">
				{/* CABECERA */}
				<div className="mb-12 text-center">
					<p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2 italic">
						DSS Validation Service
					</p>
					<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
						Firma <span className="text-slate-400">Digital</span>
					</h1>
					<p className="text-slate-500 font-bold text-xs mt-4 uppercase tracking-widest">
						Sube el documento PDF firmado electrónicamente para su validación
					</p>
				</div>

				<div className="bg-white rounded-[3.5rem] shadow-2xl p-12 border border-white relative overflow-hidden">
					{/* ÁREA DE CARGA */}
					<div
						onClick={() => fileInputRef.current?.click()}
						className={`group cursor-pointer border-4 border-dashed rounded-[2.5rem] p-12 transition-all flex flex-col items-center justify-center min-h-[300px] ${
							file
								? "border-blue-500 bg-blue-50"
								: "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
						}`}
					>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							accept=".pdf"
							className="hidden"
						/>

						{!file ? (
							<>
								<div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
									<svg
										className="w-8 h-8 text-slate-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
										/>
									</svg>
								</div>
								<p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
									Haz click para adjuntar tu archivo.
								</p>
							</>
						) : (
							<>
								<div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
									<svg
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="3"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
								<p className="text-sm font-black text-blue-900 uppercase tracking-tighter truncate max-w-xs">
									{file.name}
								</p>
								<p className="text-[9px] font-bold text-blue-400 mt-2 uppercase tracking-widest">
									Listo para validar
								</p>
							</>
						)}
					</div>

					{/* FEEDBACK DE ESTADO */}
					{status.msg && (
						<div
							className={`mt-8 p-6 rounded-3xl flex items-center gap-4 ${
								status.type === "success"
									? "bg-green-50 text-green-700 border border-green-100"
									: "bg-red-50 text-red-700 border border-red-100"
							}`}
						>
							<span className="text-xl">
								{status.type === "success" ? "✓" : "!"}
							</span>
							<p className="text-[10px] font-black uppercase tracking-widest leading-tight">
								{status.msg}
							</p>
						</div>
					)}

					{/* BOTÓN DE ACCIÓN */}
					<div className="mt-10 flex flex-col gap-4">
						<button
							disabled={!file || loading}
							onClick={uploadFirma}
							className="w-full bg-slate-900 text-white p-8 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all shadow-xl hover:bg-blue-600 disabled:opacity-10 active:scale-95"
						>
							{loading ? "VALIDANDO FIRMA..." : "PROCESAR Y FINALIZAR"}
						</button>

						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-600 transition-all"
						>
							[ Volver a la petición ]
						</button>
					</div>

					{/* METADATOS DE SEGURIDAD (Decorativo) */}
					<div className="absolute top-6 right-10 flex gap-2">
						<div className="h-1 w-8 bg-slate-100 rounded-full"></div>
						<div className="h-1 w-4 bg-slate-100 rounded-full"></div>
					</div>
				</div>

				<p className="text-center mt-12 text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
					Integridad verificada mediante DSS Protocol
				</p>
			</div>
		</div>
	);
}
