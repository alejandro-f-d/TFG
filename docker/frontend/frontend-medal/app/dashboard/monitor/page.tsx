"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface Monitor {
	uuidmonitoreo: string;
	nombreobjetivo: string;
	direccion: string;
	ultimo_estado_disponible: boolean;
	ultimo_codigo_http: number;
	cadacuantosegundos: number;
	metodo_http: string;
}

export default function MonitorPage() {
	const router = useRouter();
	const [monitores, setMonitores] = useState<Monitor[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	// Verificación de permisos desde localStorage
	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			const raw = localStorage.getItem("permisos");
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	}, []);

	const puedeCrear =
		permisos.includes("admin:total") ||
		permisos.includes("monitor:postMonitor");

	// Función de carga de datos (Memoizada para evitar re-renders infinitos)
	const fetchData = useCallback(
		async (isSilent = false) => {
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

			try {
				// Solo mostramos el skeleton/loading en la primera carga o búsqueda activa
				if (!isSilent) setLoading(true);

				const res = await fetch(
					`${baseUrl}/api/monitor?filtroNombre=${search}&limit=50`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const data = await res.json();
				if (res.ok) {
					setMonitores(data.info?.info || []);
				}
			} catch (error) {
				console.error("Error al sincronizar monitores:", error);
			} finally {
				setLoading(false);
			}
		},
		[search],
	);

	// Efecto para Controlar el Tiempo Real y la Búsqueda
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			fetchData();
		}, 300);

		const intervalId = setInterval(() => {
			fetchData(true); // true para que no aparezca el spinner de carga constantemente
		}, 60000);

		return () => {
			clearTimeout(timeoutId);
			clearInterval(intervalId);
		};
	}, [fetchData]);

	return (
		<div className="min-h-screen bg-slate-50/50 py-12 px-8 font-sans antialiased text-slate-900">
			<div className="max-w-7xl mx-auto">
				{/* --- HEADER FORMAL --- */}
				<header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
					<div className="space-y-1">
						<button
							onClick={() => router.back()}
							className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-blue-600 transition-colors flex items-center gap-1 group"
						>
							<span className="group-hover:-translate-x-1 transition-transform">
								←
							</span>{" "}
							Dashboard
						</button>
						<h1 className="text-3xl font-bold text-slate-900 tracking-tight">
							Estado de los Servicios
						</h1>
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
							</span>
							<p className="text-slate-500 text-xs font-medium">
								Actualizando en tiempo real cada minuto.
							</p>
						</div>
					</div>

					<div className="flex gap-3 w-full md:w-auto">
						<div className="relative flex-1 md:w-80">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2.5"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</span>
							<input
								type="text"
								placeholder="Filtrar servicios..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 shadow-sm"
							/>
						</div>
						{puedeCrear && (
							<button
								onClick={() => router.push("/dashboard/monitor/nuevo")}
								className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
							>
								<span>Nuevo Monitor</span>
							</button>
						)}
					</div>
				</header>

				{/* --- GRID DE SERVICIOS --- */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{loading
						? // SKELETON LOADING
							Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse"
								>
									<div className="h-4 bg-slate-100 rounded w-1/4 mb-4"></div>
									<div className="h-6 bg-slate-100 rounded w-3/4 mb-2"></div>
									<div className="h-4 bg-slate-100 rounded w-1/2 mb-6"></div>
									<div className="h-10 bg-slate-50 rounded-xl"></div>
								</div>
							))
						: monitores.map((m) => (
								<div
									key={m.uuidmonitoreo}
									onClick={() =>
										router.push(`/dashboard/monitor/${m.uuidmonitoreo}`)
									}
									className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group relative"
								>
									<div className="flex justify-between items-start mb-4">
										<div className="flex items-center gap-2">
											<span
												className={`h-2.5 w-2.5 rounded-full ${m.ultimo_estado_disponible ? "bg-emerald-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"}`}
											></span>
											<span
												className={`text-[10px] font-bold uppercase tracking-widest ${m.ultimo_estado_disponible ? "text-emerald-600" : "text-red-600"}`}
											>
												{m.ultimo_estado_disponible ? "Online" : "Offline"}
											</span>
										</div>
										<span className="text-[10px] font-mono font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
											HTTP {m.ultimo_codigo_http}
										</span>
									</div>

									<h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
										{m.nombreobjetivo}
									</h3>
									<p className="text-[11px] text-slate-400 mt-1 mb-6 font-mono truncate bg-slate-50/50 p-1.5 rounded">
										{m.direccion}
									</p>

									<div className="flex justify-between items-center pt-4 border-t border-slate-50">
										<div className="flex flex-col">
											<span className="text-[9px] font-bold text-slate-400 uppercase">
												Frecuencia
											</span>
											<span className="text-xs font-semibold text-slate-600">
												{m.cadacuantosegundos}s
											</span>
										</div>
										<div className="text-right flex flex-col">
											<span className="text-[9px] font-bold text-slate-400 uppercase">
												Método
											</span>
											<span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
												{m.metodo_http.split(" ")[0]}
											</span>
										</div>
									</div>
								</div>
							))}
				</div>

				{/* ESTADO VACÍO */}
				{!loading && monitores.length === 0 && (
					<div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
						<div className="text-4xl mb-4">📡</div>
						<h3 className="text-lg font-semibold text-slate-900">
							No se encontraron nodos
						</h3>
						<p className="text-slate-500 text-sm mt-1">
							Ajuste los criterios de búsqueda o registre un nuevo servicio.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
