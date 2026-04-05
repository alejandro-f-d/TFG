"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface PeticionTable {
	idpeticion: number;
	uuidpeticion: string;
	fechacreacion: string;
	estado: string;
	nombreproyectoasociado: string;
	nombreservicioasociado: string;
	cpusolicitada: string;
	ram: string;
	disco: string;
	prioridad_nombre: string;
	nombre_creador: string;
}

export default function PeticionesPage() {
	const router = useRouter();

	const [peticiones, setPeticiones] = useState<PeticionTable[]>([]);
	const [statusTab, setStatusTab] = useState<string>("PENDIENTE");
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Iniciamos en false para evitar parpadeos, se activará tras el fetch
	const [canCreate, setCanCreate] = useState<boolean>(false);

	// --- 1. VERIFICAR PERFIL (esresponsable: false) ---
	useEffect(() => {
		const token = localStorage.getItem("token");
		// Intentamos obtener el UUID de varias keys comunes por si acaso
		const userUuid = localStorage.getItem("uuidUser");

		if (!token) {
			console.error("DEBUG: No hay token");
			logout();
			return;
		}

		const checkUserRole = async () => {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
				console.log(`DEBUG: Consultando perfil para UUID: ${userUuid}`);

				const res = await fetch(`${baseUrl}/api/user/${userUuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await res.json();

				console.log("DEBUG: Respuesta perfil:", data);

				if (res.ok && data.info) {
					// Verificamos el campo exacto: esresponsable
					const isNotResponsable = data.info.esresponsable === false;
					console.log(`DEBUG: ¿Puede crear? ${isNotResponsable}`);
					setCanCreate(isNotResponsable);
				}
			} catch (e) {
				console.error("DEBUG: Error en fetch de perfil", e);
			}
		};

		if (userUuid) {
			checkUserRole();
		} else {
			console.warn("DEBUG: No se encontró UUID en localStorage");
		}
	}, []);

	// --- 2. LISTADO DE PETICIONES ---
	const fetchPeticiones = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("token");
		if (!token) return;

		try {
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			let apiStatus = statusTab;
			if (statusTab === "DENEGADA") apiStatus = "RECHAZADA";
			if (statusTab === "REALIZADA") apiStatus = "COMPLETADA";

			const res = await fetch(
				`${baseUrl}/api/peticion?page=${page}&limit=8&status=${apiStatus}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const data = await res.json();

			if (res.ok && data.info) {
				setPeticiones(data.info.rows || []);
				setTotalPages(data.info.pagination?.totalPages || 1);
			} else {
				setPeticiones([]);
			}
		} catch (e) {
			console.error("DEBUG: Error listando peticiones", e);
		} finally {
			setLoading(false);
		}
	}, [statusTab, page]);

	useEffect(() => {
		fetchPeticiones();
	}, [fetchPeticiones]);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<div className="max-w-7xl mx-auto">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
					<div>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Sistema de <span className="text-blue-600">PETICIONES.</span>
						</h1>
						<p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4 italic">
							Sistema de gestión de recursos.
						</p>
					</div>

					{/* BOTÓN: Solo se renderiza si canCreate es estrictamente true */}
					{canCreate && (
						<button
							onClick={() => router.push("/dashboard/peticiones/nueva")}
							className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-2xl active:scale-95"
						>
							+ Solicitar Recursos
						</button>
					)}
				</div>

				<div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
					{["PENDIENTE", "DENEGADA", "REALIZADA"].map((tab) => (
						<button
							key={tab}
							onClick={() => {
								setStatusTab(tab);
								setPage(1);
							}}
							className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
								statusTab === tab
									? "bg-slate-900 text-white shadow-xl"
									: "bg-white text-slate-400 border border-slate-100 hover:border-slate-300 shadow-sm"
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				<div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
					{loading ? (
						<div className="p-32 text-center font-black text-slate-200 uppercase tracking-[0.5em] animate-pulse">
							Accediendo a registros...
						</div>
					) : peticiones.length === 0 ? (
						<div className="p-32 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">
							Sin registros en {statusTab}
						</div>
					) : (
						<table className="w-full text-left">
							<thead>
								<tr className="bg-slate-50/50 border-b border-slate-50">
									<th className="p-8 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
										Proyecto
									</th>
									<th className="p-8 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center">
										Config
									</th>
									<th className="p-8 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
										Info
									</th>
									<th className="p-8 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">
										Detalle
									</th>
								</tr>
							</thead>
							<tbody>
								{peticiones.map((pet) => (
									<tr
										key={pet.uuidpeticion}
										className="hover:bg-slate-50/30 border-b border-slate-50 last:border-0 transition-colors group"
									>
										<td className="p-8">
											<div className="font-black text-slate-900 uppercase tracking-tighter text-xl group-hover:text-blue-600 transition-colors">
												{pet.nombreproyectoasociado}
											</div>
											<div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
												{pet.nombreservicioasociado}
											</div>
										</td>
										<td className="p-8">
											<div className="flex items-center justify-center gap-2">
												{["CPU", "RAM", "DISK"].map((label, idx) => (
													<div
														key={label}
														className="bg-slate-100 px-3 py-2 rounded-lg text-center min-w-[55px]"
													>
														<span className="block text-[6px] font-black text-slate-400 uppercase mb-0.5">
															{label}
														</span>
														<span className="text-[11px] font-black text-slate-900">
															{idx === 0
																? pet.cpusolicitada
																: idx === 1
																	? pet.ram
																	: pet.disco}
														</span>
													</div>
												))}
											</div>
										</td>
										<td className="p-8">
											<div className="flex flex-col gap-1">
												<span
													className={`w-fit text-[7px] font-black px-3 py-1 rounded-md uppercase ${
														pet.prioridad_nombre === "INMEDIATO"
															? "bg-red-500 text-white"
															: "bg-slate-900 text-white"
													}`}
												>
													{pet.prioridad_nombre}
												</span>
												<span className="text-[9px] font-bold text-slate-500 uppercase italic">
													Por: {pet.nombre_creador}
												</span>
											</div>
										</td>
										<td className="p-8 text-right">
											<button
												onClick={() =>
													router.push(
														`/dashboard/peticiones/${pet.uuidpeticion}`,
													)
												}
												className="bg-slate-900 text-white w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-blue-600 transition-all text-sm"
											>
												→
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				{totalPages > 1 && (
					<div className="flex justify-center items-center mt-12 gap-4">
						<button
							disabled={page === 1}
							onClick={() => setPage((p) => p - 1)}
							className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all font-black italic"
						>
							‹
						</button>
						<div className="bg-white px-6 py-2 rounded-xl border border-slate-100 text-[10px] font-black text-slate-900 font-mono italic">
							PAG {page} // {totalPages}
						</div>
						<button
							disabled={page === totalPages}
							onClick={() => setPage((p) => p + 1)}
							className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all font-black italic"
						>
							›
						</button>
					</div>
				)}
			</div>

			<style jsx global>{`
				.no-scrollbar::-webkit-scrollbar { display: none; }
				.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
			`}</style>
		</div>
	);
}
