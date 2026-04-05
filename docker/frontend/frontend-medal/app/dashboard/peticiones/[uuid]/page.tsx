"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface PeticionFull {
	uuidpeticion: string;
	estado: string;
	fechacreacion: string;
	cpusolicitada: string;
	gpusolicitada: string;
	ram: string;
	disco: string;
	nombreproyectoasociado: string;
	nombreservicioasociado: string;
	sistemaoperativo: string;
	docker: string;
	prioridad_nombre: string;
	momento_ejecucion_nombre: string;
	comentariosadicionales: string | null;
}

export default function PeticionDetailPage() {
	const params = useParams();
	const router = useRouter();

	// Normalizamos el UUID para evitar errores de compilación (Next.js Params puede ser string o string[])
	const uuid =
		typeof params?.uuid === "string"
			? params.uuid
			: Array.isArray(params?.uuid)
				? params.uuid[0]
				: "";

	const [peticion, setPeticion] = useState<PeticionFull | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// --- 1. CARGA DE DATOS (API + PDF) ---
	useEffect(() => {
		const fetchData = async () => {
			const token = localStorage.getItem("token");
			if (!token) return logout();
			if (!uuid) return;

			try {
				const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

				// Fetch de datos técnicos
				const resData = await fetch(`${baseUrl}/api/peticion/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (resData.ok) {
					const data = await resData.json();
					setPeticion(data.info);
				}

				// Fetch del archivo PDF como Blob
				const resFile = await fetch(`${baseUrl}/api/peticion/${uuid}/file`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (resFile.ok) {
					const blob = await resFile.blob();
					const url = URL.createObjectURL(blob);
					setPdfUrl(url);
				}
			} catch (e) {
				console.error("Error en la carga del expediente:", e);
			} finally {
				setLoading(false);
			}
		};

		fetchData();

		// Limpieza de memoria al salir de la página
		return () => {
			if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		};
	}, [uuid]);

	// --- 2. MANEJADOR DE DESCARGA SEGURO ---
	const handleDownload = () => {
		if (!pdfUrl || !peticion || !uuid) return;

		const link = document.createElement("a");
		link.href = pdfUrl;

		// Nombre de archivo sanitizado sin errores de tipo
		const fileName = `EXPEDIENTE_${peticion.nombreproyectoasociado.replace(/\s+/g, "_")}_${uuid.slice(0, 8)}.pdf`;

		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading)
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse">
				Sincronizando Expediente...
			</div>
		);

	if (!peticion)
		return (
			<div className="min-h-screen flex items-center justify-center font-black text-red-500 uppercase tracking-widest italic">
				Error: Registro no localizado en el sistema
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<div className="max-w-[1600px] mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
					<div>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4 block italic"
						>
							[ ← Regresar al Listado General ]
						</button>
						<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Detalle{" "}
							<span className="text-blue-600 italic">#{uuid.slice(0, 8)}</span>
						</h1>
						<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4">
							INFRASTRUCTURE RESOURCE ALLOCATION
						</p>
					</div>

					<div className="flex flex-wrap gap-4">
						{/* Botón Descarga */}
						<button
							onClick={handleDownload}
							disabled={!pdfUrl}
							className="group flex items-center gap-4 bg-white border-2 border-slate-900 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-100 disabled:opacity-20"
						>
							<span className="text-lg group-hover:translate-y-1 transition-transform italic">
								↓
							</span>
							Exportar PDF
						</button>

						{/* Botón Firma */}
						<button
							onClick={() => router.push(`/dashboard/peticiones/${uuid}/firma`)}
							className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100 active:scale-95"
						>
							Procesar Firma Digital
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* COLUMNA IZQUIERDA: MÉTRICAS */}
					<div className="lg:col-span-5 space-y-8">
						{/* ESTADO */}
						<div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
							<div>
								<p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
									Estado
								</p>
								<span
									className={`px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-widest ${
										peticion.estado === "APROBADA"
											? "bg-emerald-100 text-emerald-600"
											: peticion.estado === "PENDIENTE"
												? "bg-amber-100 text-amber-600"
												: "bg-red-100 text-red-600"
									}`}
								>
									{peticion.estado}
								</span>
							</div>
							<div className="text-right">
								<p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
									Fecha Solicitud
								</p>
								<p className="text-[10px] font-mono font-black text-slate-900">
									{new Date(peticion.fechacreacion).toLocaleDateString()}
								</p>
							</div>
						</div>

						{/* HARDWARE DARK CARD */}
						<div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl overflow-hidden relative">
							<h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-12 italic">
								Hardware Allocation
							</h2>
							<div className="grid grid-cols-2 gap-10 relative z-10">
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 tracking-widest">
										vCPU Cores
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.cpusolicitada}
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 tracking-widest">
										RAM Memory
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.ram}G
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 tracking-widest">
										GPU Units
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.gpusolicitada}
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 tracking-widest">
										Disk SSD
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.disco}
									</p>
								</div>
							</div>
						</div>

						{/* SOFTWARE INFO */}
						<div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
							<div className="space-y-10">
								<div>
									<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic decoration-blue-500 decoration-2 underline underline-offset-4">
										Proyecto
									</p>
									<p className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
										{peticion.nombreproyectoasociado}
									</p>
									<p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider">
										{peticion.nombreservicioasociado}
									</p>
								</div>

								<div className="grid grid-cols-2 gap-6">
									<div className="bg-slate-50 p-6 rounded-2xl">
										<p className="text-[7px] font-black text-slate-400 uppercase mb-3 italic">
											OS Target
										</p>
										<p className="text-xs font-black text-slate-700 uppercase tracking-tighter">
											{peticion.sistemaoperativo}
										</p>
									</div>
									<div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
										<p className="text-[7px] font-black text-blue-400 uppercase mb-3 italic">
											Image Tag
										</p>
										<p className="text-[10px] font-mono font-bold text-blue-600 truncate">
											{peticion.docker}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* COLUMNA DERECHA: VISOR PDF */}
					<div className="lg:col-span-7 min-h-[900px]">
						<div className="bg-white w-full h-full rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden relative group">
							{pdfUrl ? (
								<iframe
									src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
									className="w-full h-full border-none"
									title="Visor PDF"
								/>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-slate-200">
									<div className="w-20 h-20 border-8 border-dashed border-slate-100 rounded-full mb-6 animate-spin"></div>
									<p className="text-[10px] font-black uppercase tracking-[0.4em]">
										Generando Documentación...
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<style jsx global>{`
                iframe::-webkit-scrollbar { display: none; }
            `}</style>
		</div>
	);
}
