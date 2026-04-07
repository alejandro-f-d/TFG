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
	nombreMaquina?: string;
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
	const uuidMaquinaPath = typeof params?.uuid === "string" ? params.uuid : "";

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

	const listaUuidsPermitidos = useMemo(() => {
		if (esAdminGlobal) return [];
		return permisos
			.filter((p: string) => p.startsWith("maquina:servicios:get:"))
			.map((p: string) => p.split(":")[3]);
	}, [permisos, esAdminGlobal]);

	const puedeCrear = useMemo(
		() =>
			esAdminGlobal ||
			permisos.includes(`maquina:crearServicios:${uuidMaquinaPath}`),
		[esAdminGlobal, permisos, uuidMaquinaPath],
	);

	const fetchServicios = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) return logout();

		setLoading(true);
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		try {
			if (esAdminGlobal) {
				const url = uuidMaquinaPath
					? `${baseUrl}/api/maquina/${uuidMaquinaPath}/servicios?page=${page}&limit=10`
					: `${baseUrl}/api/servicios?page=${page}&limit=10`;

				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const response = await res.json();
					setServicios(response.info.data);
					setPagination(response.info.pagination);
				}
			} else {
				const targets = uuidMaquinaPath
					? [uuidMaquinaPath]
					: listaUuidsPermitidos;

				// FIX: Tipado explícito (uuid: string) para evitar error de compilación
				const promesas = targets.map((uuid: string) =>
					fetch(
						`${baseUrl}/api/maquina/${uuid}/servicios?page=${page}&limit=5`,
						{
							headers: { Authorization: `Bearer ${token}` },
						},
					).then(async (r) => {
						if (!r.ok) return null;
						return r.json();
					}),
				);

				const resultados = await Promise.all(promesas);

				const allServices = resultados
					.filter((r) => r !== null && r.info?.data)
					.flatMap((r) => r.info.data);

				setServicios(allServices);

				setPagination({
					totalItems: allServices.length,
					totalPages: 1,
					currentPage: 1,
					itemsPerPage: 10,
				});
			}
		} catch (e) {
			console.error("Error fetching services:", e);
		} finally {
			setLoading(false);
		}
	}, [uuidMaquinaPath, page, esAdminGlobal, listaUuidsPermitidos]);

	useEffect(() => {
		fetchServicios();
	}, [fetchServicios]);

	if (loading && page === 1)
		return (
			<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse italic">
				Sincronizando Clusters...
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
							{esAdminGlobal ? "Nodos" : "Mis"}{" "}
							<span className="text-blue-600 italic">Servicios</span>
						</h1>
						{!esAdminGlobal && (
							<p className="text-[10px] font-bold text-slate-400 uppercase mt-4 tracking-widest italic">
								Basado en privilegios de infraestructura
							</p>
						)}
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

				{/* GRID */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{servicios.length > 0 ? (
						servicios.map((s) => (
							<div
								key={s.uuidservicio}
								className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-2xl hover:border-blue-100 transition-all group relative overflow-hidden"
							>
								<div className="absolute top-0 right-0 p-8">
									<div
										className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest ${s.activo ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}
									>
										<span
											className={`w-1.5 h-1.5 rounded-full ${s.activo ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
										/>
										{s.activo ? "Online" : "Offline"}
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

									<div className="mb-10">
										<div className="flex flex-wrap gap-3">
											{s.lista_puertos?.map((p) => (
												<div
													key={p.id}
													className="bg-slate-50 border border-slate-100 p-3 rounded-xl min-w-[80px] hover:bg-slate-900 hover:text-white transition-all"
												>
													<div className="flex justify-between items-start mb-1">
														<span className="text-[7px] font-black opacity-50 uppercase">
															{p.protocolo}
														</span>
													</div>
													<p className="text-lg font-black italic leading-none">
														{p.puerto}
													</p>
													<p className="text-[7px] font-bold uppercase mt-1 truncate max-w-[60px]">
														{p.nombre}
													</p>
												</div>
											))}
											<div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-center">
												<p className="text-[8px] font-black text-blue-600 uppercase italic px-2">
													{s.softwarebase}
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="flex items-center justify-between pt-8 border-t border-slate-50">
									<p className="text-[9px] font-mono text-slate-300 uppercase">
										ID: {s.uuidservicio.slice(0, 13)}...
									</p>
									<button
										onClick={() =>
											router.push(`/dashboard/servicios/${s.uuidservicio}`)
										}
										className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[9px] uppercase hover:bg-blue-600 transition-all shadow-lg"
									>
										Panel de Control
									</button>
								</div>
							</div>
						))
					) : (
						<div className="col-span-full py-20 text-center">
							<p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
								Sin servicios detectados
							</p>
						</div>
					)}
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
							← Anterior
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
							Siguiente →
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
