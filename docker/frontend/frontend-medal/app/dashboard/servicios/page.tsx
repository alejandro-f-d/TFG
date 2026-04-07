"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface Puerto {
	id: number;
	puerto: number;
	protocolo: string;
	nombre: string;
}

interface Servicio {
	uuidservicio: string;
	nombreservicio: string;
	descripciontecnica: string;
	entorno: string;
	publico: boolean;
	softwarebase: string;
	activo?: boolean;
	status?: string;
	lista_puertos: Puerto[];
}

interface Pagination {
	totalItems: number;
	totalPages: number;
	currentPage: number;
	itemsPerPage: number;
}

export default function MaquinaServiciosPage() {
	const params = useParams();
	const router = useRouter();
	const uuidMaquina = typeof params?.uuid === "string" ? params.uuid : "";

	const [servicios, setServicios] = useState<Servicio[]>([]);
	const [pagination, setPagination] = useState<Pagination | null>(null);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);

	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("permisos") || "[]");
		} catch {
			return [];
		}
	}, []);

	const esAdminGlobal = useMemo(
		() =>
			permisos.includes("admin:total") || permisos.includes("servicios:getAll"),
		[permisos],
	);

	const puedeCrear = useMemo(
		() =>
			permisos.includes("admin:total") ||
			permisos.includes(`maquina:crearServicios:${uuidMaquina}`),
		[permisos, uuidMaquina],
	);

	const fetchServicios = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) return logout();

		setLoading(true);
		try {
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			const url = esAdminGlobal
				? `${baseUrl}/api/servicios?page=${page}&limit=10`
				: `${baseUrl}/api/maquina/${uuidMaquina}/servicios?page=${page}&limit=10`;

			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (res.ok) {
				const response = await res.json();
				setServicios(response.info.data);
				setPagination(response.info.pagination);
			}
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	}, [uuidMaquina, page, esAdminGlobal]);

	useEffect(() => {
		fetchServicios();
	}, [fetchServicios]);

	if (loading && page === 1)
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse italic">
				Mapping Network Ports...
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<div className="max-w-[1400px] mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 border-b-2 border-slate-100 pb-12">
					<div>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase mb-4 block hover:text-blue-600 transition-colors tracking-widest"
						>
							[ ← Volver ]
						</button>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							{esAdminGlobal ? "Nodos" : "Servicios"}{" "}
							<span className="text-blue-600 italic">
								{esAdminGlobal ? "Globales" : "Activos"}
							</span>
						</h1>
					</div>

					{puedeCrear && (
						<button
							onClick={() => router.push(`/dashboard/servicios/nuevo`)}
							className="bg-blue-600 text-white px-12 py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-blue-100"
						>
							+ Registrar Servicio
						</button>
					)}
				</div>

				{/* GRID DE CARDS (Mucho más escalable que filas) */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{servicios.map((s) => (
						<div
							key={s.uuidservicio}
							className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-2xl hover:border-blue-100 transition-all group relative overflow-hidden"
						>
							{/* Indicador de Estado Flotante */}
							<div className="absolute top-0 right-0 p-8">
								<div
									className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest ${
										s.activo || s.status === "working"
											? "bg-emerald-50 text-emerald-500"
											: "bg-red-50 text-red-500"
									}`}
								>
									<span
										className={`w-1.5 h-1.5 rounded-full ${s.activo || s.status === "working" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
									/>
									{s.status || (s.activo ? "Working" : "Down")}
								</div>
							</div>

							<div>
								<div className="mb-8">
									<p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 italic">
										{s.entorno}
									</p>
									<h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
										{s.nombreservicio}
									</h3>
									<p className="text-slate-400 text-[11px] font-medium mt-4 leading-relaxed max-w-sm">
										{s.descripciontecnica}
									</p>
								</div>

								{/* CONTENEDOR DE PUERTOS (Solución a múltiples puertos) */}
								<div className="mb-10">
									<p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-4">
										Endpoints & Stack
									</p>
									<div className="flex flex-wrap gap-3">
										{s.lista_puertos.map((p) => (
											<div
												key={p.id}
												className="bg-slate-50 border border-slate-100 p-3 rounded-xl min-w-[80px] hover:bg-slate-900 hover:text-white transition-all"
											>
												<div className="flex justify-between items-start mb-1">
													<span className="text-[7px] font-black opacity-50 uppercase">
														{p.protocolo}
													</span>
													<div className="w-1 h-1 rounded-full bg-blue-500" />
												</div>
												<p className="text-lg font-black italic leading-none">
													{p.puerto}
												</p>
												<p className="text-[7px] font-bold uppercase mt-1 truncate max-w-[60px]">
													{p.nombre}
												</p>
											</div>
										))}

										{/* Tag de Software Base como un puerto más pero distinguible */}
										<div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-center">
											<p className="text-[8px] font-black text-blue-600 uppercase italic whitespace-nowrap px-2">
												{s.softwarebase}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-between pt-8 border-t border-slate-50">
								<p className="text-[9px] font-mono text-slate-300">
									UUID: {s.uuidservicio.slice(0, 18)}...
								</p>
								<button
									onClick={() =>
										router.push(`/dashboard/servicios/${s.uuidservicio}`)
									}
									className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[9px] uppercase hover:bg-blue-600 transition-all shadow-lg"
								>
									Ver Panel de Control
								</button>
							</div>
						</div>
					))}
				</div>

				{/* PAGINACIÓN */}
				{pagination && pagination.totalPages > 1 && (
					<div className="mt-20 flex justify-center items-center gap-12">
						<button
							disabled={page === 1}
							onClick={() => {
								setPage((p) => p - 1);
								window.scrollTo(0, 0);
							}}
							className="text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-10 hover:text-blue-600 transition-all italic"
						>
							← Prev Page
						</button>
						<div className="h-[2px] w-20 bg-slate-100 relative">
							<div
								className="absolute h-full bg-blue-600 transition-all duration-500"
								style={{ width: `${(page / pagination.totalPages) * 100}%` }}
							/>
						</div>
						<button
							disabled={page === pagination.totalPages}
							onClick={() => {
								setPage((p) => p + 1);
								window.scrollTo(0, 0);
							}}
							className="text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-10 hover:text-blue-600 transition-all italic"
						>
							Next Page →
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
