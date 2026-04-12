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
	status: string;
	nivelseveridad: string;
	lista_maquinas: string[];
	lista_puertos: Puerto[];
	uuidmaquina?: string;
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
	const [searchTerm, setSearchTerm] = useState<string>("");

	// --- GESTIÓN DE PERMISOS ---
	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			const stored = localStorage.getItem("permisos");
			return JSON.parse(stored || "[]");
		} catch {
			return [];
		}
	}, []);

	const esAdminGlobal = useMemo(
		() =>
			permisos.includes("admin:total") || permisos.includes("servicios:getAll"),
		[permisos],
	);

	// Extraer UUIDs de máquinas con permiso "verServicios"
	const maquinasPermitidas = useMemo(() => {
		if (esAdminGlobal) return [];
		return permisos
			.filter((p: string) => p.startsWith("maquina:verServicios:"))
			.map((p: string) => p.split(":")[2]);
	}, [permisos, esAdminGlobal]);

	// Lógica para el botón de creación
	const puedeCrearServicios = useMemo(() => {
		if (esAdminGlobal) return true;
		if (uuidMaquinaPath) {
			return permisos.includes(`maquina:crearServicios:${uuidMaquinaPath}`);
		}
		return permisos.some((p: string) =>
			p.startsWith("maquina:crearServicios:"),
		);
	}, [esAdminGlobal, permisos, uuidMaquinaPath]);

	const fetchServicios = useCallback(async () => {
		const token = localStorage.getItem("token");
		if (!token) return logout();

		setLoading(true);
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
		const filterQuery = `page=${page}&limit=10${searchTerm ? `&filtroNombre=${encodeURIComponent(searchTerm)}` : ""}`;

		try {
			let serviciosConsolidados: Servicio[] = [];
			let infoPagination: Pagination | null = null;

			if (esAdminGlobal || uuidMaquinaPath) {
				// CASO A: Admin o vista de máquina única
				const url = uuidMaquinaPath
					? `${baseUrl}/api/maquina/${uuidMaquinaPath}/servicios?${filterQuery}`
					: `${baseUrl}/api/servicios?${filterQuery}`;

				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (res.ok) {
					const response = await res.json();
					serviciosConsolidados = response.info.data;
					infoPagination = response.info.pagination;
				}
			} else {
				// CASO B: Usuario limitado (Multi-fetch por UUID de permisos)
				// Se añade tipado explícito (uuid: string) para evitar el error de compilación
				const promesas = maquinasPermitidas.map((uuid: string) =>
					fetch(`${baseUrl}/api/maquina/${uuid}/servicios?${filterQuery}`, {
						headers: { Authorization: `Bearer ${token}` },
					}).then((r) => r.json()),
				);

				const resultados = await Promise.all(promesas);

				resultados.forEach((res) => {
					if (res.info?.data) {
						serviciosConsolidados = [
							...serviciosConsolidados,
							...res.info.data,
						];
					}
				});

				// Tomamos la paginación del primer resultado como referencia
				infoPagination = resultados[0]?.info?.pagination || null;
			}

			setServicios(serviciosConsolidados);
			setPagination(infoPagination);
		} catch (e) {
			console.error("Error en la sincronización:", e);
		} finally {
			setLoading(false);
		}
	}, [uuidMaquinaPath, page, searchTerm, esAdminGlobal, maquinasPermitidas]);

	useEffect(() => {
		const delayDebounce = setTimeout(() => {
			fetchServicios();
		}, 300);
		return () => clearTimeout(delayDebounce);
	}, [fetchServicios]);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<div className="max-w-[1400px] mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 border-b-2 border-slate-100 pb-12">
					<div className="flex-1">
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase mb-4 block hover:text-blue-600 transition-colors tracking-widest"
						>
							[ ← Volver ]
						</button>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							{esAdminGlobal ? "Infra" : "Mis"}{" "}
							<span className="text-blue-600 italic">Servicios</span>
						</h1>
					</div>

					<div className="flex flex-col md:flex-row gap-6 items-center w-full md:w-auto">
						{puedeCrearServicios && (
							<button
								onClick={() => router.push("/dashboard/servicios/nuevo")}
								className="bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl flex items-center gap-3 active:scale-95"
							>
								<span className="text-xl">+</span> Desplegar Servicio
							</button>
						)}

						<div className="relative w-full md:w-80">
							<input
								type="text"
								placeholder="BUSCAR SERVICIO..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPage(1);
								}}
								className="w-full bg-white border border-slate-100 rounded-2xl py-5 pl-12 pr-6 text-[10px] font-black text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-600 outline-none uppercase tracking-widest shadow-sm"
							/>
						</div>
					</div>
				</div>

				{/* GRID DE SERVICIOS */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
					{loading && page === 1 ? (
						<div className="col-span-full py-32 text-center font-black text-slate-200 uppercase tracking-[0.5em] animate-pulse">
							Sincronizando Cluster...
						</div>
					) : servicios.length > 0 ? (
						servicios.map((s) => {
							const hostUUID =
								s.lista_maquinas && s.lista_maquinas.length > 0
									? s.lista_maquinas[0]
									: s.uuidmaquina || uuidMaquinaPath;

							return (
								<div
									key={s.uuidservicio}
									className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl transition-all group relative"
								>
									<div className="absolute top-8 right-8">
										<div
											className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[8px] uppercase tracking-widest ${s.status === "working" ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"}`}
										>
											<span
												className={`w-1.5 h-1.5 rounded-full ${s.status === "working" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
											/>
											{s.status === "working" ? "Online" : "Offline"}
										</div>
									</div>

									<div className="mb-8">
										<p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 italic">
											{s.entorno} // SEV: {s.nivelseveridad}
										</p>
										<h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
											{s.nombreservicio}
										</h3>
										<p className="text-slate-400 text-[11px] font-medium mt-4 leading-relaxed max-w-sm line-clamp-2">
											{s.descripciontecnica}
										</p>
									</div>

									<div className="mb-10 flex flex-wrap gap-2">
										{s.lista_puertos?.map((p, idx) => (
											<div
												key={p.id || idx}
												className="bg-slate-50 border border-slate-100 p-3 rounded-xl min-w-[60px] text-center"
											>
												<span className="text-[7px] font-black opacity-40 uppercase block">
													{p.protocolo}
												</span>
												<p className="text-sm font-black italic">{p.puerto}</p>
											</div>
										))}
									</div>

									<div className="flex items-center justify-between pt-8 border-t border-slate-50">
										<div className="flex flex-col">
											<p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">
												Node ID
											</p>
											<p className="text-[9px] font-mono text-slate-400 uppercase">
												{hostUUID ? `${hostUUID.slice(0, 18)}...` : "GLOBAL"}
											</p>
										</div>

										<button
											onClick={() => {
												if (hostUUID)
													router.push(
														`/dashboard/maquinas/${hostUUID}/servicios/${s.uuidservicio}`,
													);
												else
													alert(
														"Error: No se pudo identificar el nodo de origen.",
													);
											}}
											className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-[9px] uppercase hover:bg-blue-600 transition-all active:scale-95 shadow-lg"
										>
											Panel de Control
										</button>
									</div>
								</div>
							);
						})
					) : (
						<div className="col-span-full py-20 text-center font-black text-slate-300 uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[3rem]">
							No se han detectado servicios en este sector
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
						<span className="text-[10px] font-black text-slate-400">
							PÁGINA {page} DE {pagination.totalPages}
						</span>
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
