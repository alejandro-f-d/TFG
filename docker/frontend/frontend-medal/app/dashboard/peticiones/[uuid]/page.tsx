"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

	const uuidPeticion =
		typeof params?.uuid === "string"
			? params.uuid
			: Array.isArray(params?.uuid)
				? params.uuid[0]
				: "";

	const [peticion, setPeticion] = useState<PeticionFull | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	// Estados para la acción de denegar
	const [showDenegarModal, setShowDenegarModal] = useState(false);
	const [razonDenegada, setRazonDenegada] = useState("");
	const [isDenying, setIsDenying] = useState(false);

	// --- LÓGICA DE PERMISOS ---
	// Verificamos si el usuario tiene los permisos necesarios en el localStorage
	const tienePermisoDenegar = useMemo(() => {
		if (typeof window === "undefined") return false;
		const permisosRaw = localStorage.getItem("permisos");
		if (!permisosRaw) return false;

		try {
			const permisos: string[] = JSON.parse(permisosRaw);
			return (
				permisos.includes("peticion:firma_administrador") ||
				permisos.includes("peticion:revisor")
			);
		} catch (e) {
			return false;
		}
	}, []);

	const fetchData = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) return logout();
		if (!uuidPeticion) return;

		try {
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

			// 1. Obtener datos técnicos de la petición
			const resData = await fetch(`${baseUrl}/api/peticion/${uuidPeticion}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (resData.ok) {
				const data = await resData.json();
				setPeticion(data.info);
			}

			// 2. Obtener el chorro de bytes del PDF para el visor
			const resFile = await fetch(
				`${baseUrl}/api/peticion/${uuidPeticion}/file`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
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
	}, [uuidPeticion]);

	useEffect(() => {
		fetchData();
		return () => {
			if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		};
	}, [fetchData]);

	// --- ACCIÓN: DENEGAR ---
	const handleDenegar = async () => {
		if (!razonDenegada.trim())
			return alert("La razón de denegación es obligatoria.");

		setIsDenying(true);
		try {
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			const res = await fetch(
				`${baseUrl}/api/peticion/${uuidPeticion}/denegar`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ razonDenegada }),
				},
			);

			if (res.ok || res.status === 204) {
				setShowDenegarModal(false);
				setRazonDenegada("");
				fetchData(); // Refrescar para actualizar estado a 'DENEGADA'
			} else {
				const err = await res.json();
				alert(err.error || "No se pudo denegar la petición.");
			}
		} catch (e) {
			alert("Error de conexión con la API.");
		} finally {
			setIsDenying(false);
		}
	};

	const handleDownload = () => {
		if (!pdfUrl || !peticion) return;
		const link = document.createElement("a");
		link.href = pdfUrl;
		link.download = `EXPEDIENTE_${peticion.nombreproyectoasociado.replace(/\s+/g, "_")}.pdf`;
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
			<div className="min-h-screen flex items-center justify-center font-black text-red-500 uppercase italic">
				Error: Petición no encontrada
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans relative">
			{/* MODAL DE DENEGACIÓN */}
			{showDenegarModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
					<div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
						<p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 italic">
							Confirmar Denegación
						</p>
						<h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-6 leading-none">
							¿Por qué se rechaza?
						</h2>
						<textarea
							value={razonDenegada}
							onChange={(e) => setRazonDenegada(e.target.value)}
							placeholder="Indique los motivos técnicos del rechazo..."
							className="w-full bg-slate-50 rounded-2xl p-6 text-sm font-medium min-h-[150px] outline-none focus:ring-2 focus:ring-red-500 transition-all mb-8 resize-none"
						/>
						<div className="flex gap-4">
							<button
								onClick={() => setShowDenegarModal(false)}
								className="flex-1 bg-slate-100 text-slate-400 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200"
							>
								Cancelar
							</button>
							<button
								onClick={handleDenegar}
								disabled={isDenying}
								className="flex-1 bg-red-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-red-100"
							>
								{isDenying ? "Procesando..." : "Denegar Petición"}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="max-w-[1600px] mx-auto">
				{/* HEADER ACTIONS */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8">
					<div>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 mb-4 block italic"
						>
							[ ← Volver al listado ]
						</button>
						<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Petición{" "}
							<span className="text-blue-600 italic">
								#{uuidPeticion.slice(0, 8)}
							</span>
						</h1>
					</div>

					<div className="flex flex-wrap gap-4">
						<button
							onClick={handleDownload}
							disabled={!pdfUrl}
							className="group flex items-center gap-4 bg-white border-2 border-slate-900 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-100"
						>
							<span className="text-lg italic group-hover:translate-y-1 transition-transform">
								↓
							</span>{" "}
							PDF
						</button>

						{peticion.estado === "PENDIENTE" && (
							<>
								{/* VISIBILIDAD BASADA EN PERMISOS ESPECÍFICOS */}
								{tienePermisoDenegar && (
									<button
										onClick={() => setShowDenegarModal(true)}
										className="bg-white border-2 border-red-500 text-red-500 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-50"
									>
										Denegar Petición
									</button>
								)}
								<button
									onClick={() =>
										router.push(`/dashboard/peticiones/${uuidPeticion}/firma`)
									}
									className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100 active:scale-95"
								>
									Firmar Digitalmente
								</button>
							</>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* INFO PANEL */}
					<div className="lg:col-span-5 space-y-8">
						<div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between">
							<div>
								<p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">
									Estado
								</p>
								<span
									className={`px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-widest ${
										peticion.estado === "REALIZADA"
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
									Creada el
								</p>
								<p className="text-[10px] font-mono font-black text-slate-900">
									{new Date(peticion.fechacreacion).toLocaleDateString()}
								</p>
							</div>
						</div>

						{/* HARDWARE DARK CARD */}
						<div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
							<h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-12 italic">
								Hardware Specs
							</h2>
							<div className="grid grid-cols-2 gap-10 relative z-10">
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 italic">
										vCPU
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.cpusolicitada}
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 italic">
										RAM
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.ram}GB
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 italic">
										GPU
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.gpusolicitada}
									</p>
								</div>
								<div>
									<p className="text-[8px] text-slate-500 uppercase font-black mb-2 italic">
										Disk
									</p>
									<p className="text-4xl font-black italic tracking-tighter">
										{peticion.disco}GB
									</p>
								</div>
							</div>
						</div>

						{/* PROJECT DATA */}
						<div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
							<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 italic decoration-blue-500 decoration-2 underline underline-offset-4">
								Proyecto Asociado
							</p>
							<p className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-8">
								{peticion.nombreproyectoasociado}
							</p>
							<div className="grid grid-cols-2 gap-4">
								<div className="bg-slate-50 p-4 rounded-xl font-black text-[10px] text-slate-600 uppercase italic">
									OS: {peticion.sistemaoperativo}
								</div>
								<div className="bg-slate-50 p-4 rounded-xl font-black text-[10px] text-slate-600 uppercase italic">
									Docker: {peticion.docker}
								</div>
							</div>
						</div>
					</div>

					{/* VISOR PDF */}
					<div className="lg:col-span-7 min-h-[900px]">
						<div className="bg-white w-full h-full rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden relative">
							{pdfUrl ? (
								<iframe
									src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
									className="w-full h-full border-none"
									title="Visor PDF"
								/>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-slate-200 uppercase font-black text-[10px] tracking-[0.5em]">
									<div className="w-20 h-20 border-8 border-dashed border-slate-100 rounded-full mb-6 animate-spin"></div>
									Cargando Documento...
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<style
				jsx
				global
			>{` iframe::-webkit-scrollbar { display: none; } `}</style>
		</div>
	);
}
