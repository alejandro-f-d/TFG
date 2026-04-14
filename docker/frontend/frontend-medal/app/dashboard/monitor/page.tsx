"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface Monitor {
	uuidmonitoreo: string;
	nombreobjetivo: string;
	direccion: string;
	valorultimarespuesta: number;
	valoresperado: number;
	contadorfallos: number;
	timeoutsegundos: number;
	cadacuantosegundos: number;
	metodo_http: string;
	ultimo_estado_disponible: boolean;
	ultimo_codigo_http: number;
}

interface MetodoMonitorizar {
	idmetodo: number;
	nombre: string;
	alias: string;
	descripcion: string;
}

export default function MonitorPage() {
	const router = useRouter();

	// Estados de datos
	const [monitores, setMonitores] = useState<Monitor[]>([]);
	const [metodos, setMetodos] = useState<MetodoMonitorizar[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");

	// Estados de UI
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [creating, setCreating] = useState(false);

	// Estado del formulario (Siguiendo el Joi Schema proporcionado)
	const [newMonitor, setNewMonitor] = useState({
		nombreObjetivo: "",
		direccion: "",
		valorEsperado: 200,
		timeOutSegundos: 5,
		umbralReintentos: 3,
		idMetodo: 0,
		cadaCuantoSegundos: 60,
	});

	// Verificación de permisos
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

	// Carga de datos (Monitores + Métodos)
	const fetchData = useCallback(async () => {
		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		try {
			setLoading(true);

			// 1. Obtener Monitores
			const resMon = await fetch(
				`${baseUrl}/api/monitor?filtroNombre=${search}&limit=50`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const dataMon = await resMon.json();
			if (resMon.ok) setMonitores(dataMon.info?.info || []);

			// 2. Obtener Métodos (solo si el array está vacío)
			if (metodos.length === 0) {
				const resMet = await fetch(
					`${baseUrl}/api/monitor/metodosMonitorizar`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const dataMet = await resMet.json();
				if (resMet.ok) {
					const listaMetodos = dataMet.metodos || [];
					setMetodos(listaMetodos);
					// Inicializar el select con el primer método disponible
					if (listaMetodos.length > 0) {
						setNewMonitor((prev) => ({
							...prev,
							idMetodo: listaMetodos[0].idmetodo,
						}));
					}
				}
			}
		} catch (error) {
			console.error("Error en fetchData:", error);
		} finally {
			setLoading(false);
		}
	}, [search, metodos.length]);

	useEffect(() => {
		const timeoutId = setTimeout(fetchData, 300); // Debounce de búsqueda
		return () => clearTimeout(timeoutId);
	}, [fetchData]);

	// Crear nuevo monitor
	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setCreating(true);

		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		// Formateo estricto de tipos para cumplir con el Backend (Joi)
		const payload = {
			nombreObjetivo: newMonitor.nombreObjetivo,
			direccion: newMonitor.direccion,
			valorEsperado: Number(newMonitor.valorEsperado),
			timeOutSegundos: Number(newMonitor.timeOutSegundos),
			umbralReintentos: Number(newMonitor.umbralReintentos),
			idMetodo: Number(newMonitor.idMetodo),
			cadaCuantoSegundos: Number(newMonitor.cadaCuantoSegundos),
		};

		try {
			const res = await fetch(`${baseUrl}/api/monitor`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				setShowCreateModal(false);
				// Resetear campos clave
				setNewMonitor((prev) => ({
					...prev,
					nombreObjetivo: "",
					direccion: "",
				}));
				fetchData();
			} else {
				const err = await res.json();
				alert(`Error de validación: ${err.message || "Verifique los datos"}`);
			}
		} catch (error) {
			alert("Error crítico al conectar con el servidor.");
		} finally {
			setCreating(false);
		}
	};

	const descripcionMetodoSeleccionado = useMemo(() => {
		return metodos.find((m) => m.idmetodo === newMonitor.idMetodo)?.descripcion;
	}, [newMonitor.idMetodo, metodos]);

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-8 font-sans">
			<div className="max-w-7xl mx-auto">
				{/* --- HEADER --- */}
				<header className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
					<div className="space-y-2">
						<button
							onClick={() => router.back()}
							className="text-[11px] font-black text-slate-600 uppercase tracking-widest block italic hover:text-blue-700 transition-colors"
						>
							[ ← VOLVER AL DASHBOARD ]
						</button>
						<h1 className="text-7xl font-black text-slate-950 tracking-tighter uppercase italic leading-none">
							System <span className="text-blue-700">Health</span>
						</h1>
					</div>

					<div className="flex gap-4 w-full md:w-auto">
						<input
							type="text"
							placeholder="FILTRAR POR NOMBRE..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="bg-white border-4 border-slate-950 rounded-2xl px-6 py-4 font-black text-[11px] uppercase focus:ring-4 focus:ring-blue-200 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-1 md:min-w-[350px] text-slate-950 placeholder:text-slate-400"
						/>
						{puedeCrear && (
							<button
								onClick={() => setShowCreateModal(true)}
								className="bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-950 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
							>
								+ REGISTRAR
							</button>
						)}
					</div>
				</header>

				{/* --- GRID DE TARJETAS --- */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
					{loading ? (
						<p className="text-2xl font-black text-slate-400 italic animate-pulse uppercase">
							Sincronizando nodos...
						</p>
					) : (
						monitores.map((m) => (
							<div
								key={m.uuidmonitoreo}
								onClick={() =>
									router.push(`/dashboard/monitor/${m.uuidmonitoreo}`)
								}
								className="bg-white p-8 rounded-[3rem] border-4 border-slate-950 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group cursor-pointer hover:-translate-y-2 hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
							>
								<div className="flex justify-between items-start mb-6">
									<div
										className={`px-4 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border-2 border-slate-950 ${m.ultimo_estado_disponible ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
									>
										{m.ultimo_estado_disponible ? "ACTIVO" : "CAÍDO"}
									</div>
									<span className="font-mono text-sm font-black text-slate-950 bg-slate-100 px-3 py-1 rounded-md border-2 border-slate-950">
										HTTP {m.ultimo_codigo_http}
									</span>
								</div>

								<h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-1 truncate group-hover:text-blue-700 transition-colors">
									{m.nombreobjetivo}
								</h3>
								<p className="text-[11px] font-bold text-slate-700 mb-8 truncate italic bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300">
									{m.direccion}
								</p>

								<div className="bg-slate-100 p-6 rounded-[2rem] flex justify-between items-center border-2 border-slate-950 group-hover:bg-blue-50 transition-colors">
									<div>
										<p className="text-[10px] font-black text-slate-600 uppercase">
											Check cada
										</p>
										<p className="font-black text-blue-700 text-2xl">
											{m.cadacuantosegundos}s
										</p>
									</div>
									<div className="text-right">
										<p className="text-[10px] font-black text-slate-600 uppercase">
											Método
										</p>
										<p className="font-black text-slate-950 text-2xl uppercase italic">
											{m.metodo_http.split(" ")[0]}
										</p>
									</div>
								</div>
							</div>
						))
					)}
				</div>

				{/* --- MODAL DE CREACIÓN (ALTO CONTRASTE) --- */}
				{showCreateModal && (
					<div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
						<form
							onSubmit={handleCreate}
							className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-2xl w-full space-y-8 border-[6px] border-slate-950 relative"
						>
							<div className="border-b-4 border-slate-950 pb-6">
								<h2 className="text-5xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
									Nueva <span className="text-blue-700">Sonda</span>
								</h2>
								<p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">
									Configuración de monitoreo de red
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="md:col-span-2">
									<label className="text-[11px] font-black text-slate-800 uppercase ml-2 tracking-widest">
										Nombre del Objetivo (Min. 3)
									</label>
									<input
										required
										minLength={3}
										maxLength={50}
										type="text"
										value={newMonitor.nombreObjetivo}
										onChange={(e) =>
											setNewMonitor({
												...newMonitor,
												nombreObjetivo: e.target.value,
											})
										}
										className="w-full bg-slate-100 p-5 rounded-2xl font-black text-slate-950 border-4 border-slate-200 focus:border-blue-700 outline-none transition-all"
										placeholder="EJ: API PRODUCCIÓN"
									/>
								</div>

								<div className="md:col-span-2">
									<label className="text-[11px] font-black text-slate-800 uppercase ml-2 tracking-widest">
										URL de Destino (http/https)
									</label>
									<input
										required
										type="url"
										value={newMonitor.direccion}
										onChange={(e) =>
											setNewMonitor({
												...newMonitor,
												direccion: e.target.value,
											})
										}
										className="w-full bg-slate-100 p-5 rounded-2xl font-black text-slate-950 border-4 border-slate-200 focus:border-blue-700 outline-none transition-all"
										placeholder="https://api.empresa.com/status"
									/>
								</div>

								<div className="md:col-span-2 bg-blue-50 p-6 rounded-[2.5rem] border-4 border-blue-200">
									<label className="text-[11px] font-black text-blue-900 uppercase ml-2 tracking-widest text-center block">
										Método de Monitoreo
									</label>
									<select
										value={newMonitor.idMetodo}
										onChange={(e) =>
											setNewMonitor({
												...newMonitor,
												idMetodo: parseInt(e.target.value),
											})
										}
										className="w-full bg-white p-4 mt-3 rounded-xl font-black text-lg text-slate-950 border-4 border-slate-950 shadow-sm uppercase italic outline-none cursor-pointer"
									>
										{metodos.map((met) => (
											<option key={met.idmetodo} value={met.idmetodo}>
												{met.nombre}
											</option>
										))}
									</select>
									{descripcionMetodoSeleccionado && (
										<p className="mt-4 text-[11px] leading-relaxed font-bold text-blue-900 bg-white/80 p-4 rounded-xl border-2 border-blue-200 italic">
											{descripcionMetodoSeleccionado}
										</p>
									)}
								</div>

								<div className="space-y-4">
									<div>
										<label className="text-[10px] font-black text-slate-800 uppercase ml-2 tracking-tighter">
											Código Esperado (100-599)
										</label>
										<input
											type="number"
											min={100}
											max={599}
											value={newMonitor.valorEsperado}
											onChange={(e) =>
												setNewMonitor({
													...newMonitor,
													valorEsperado: parseInt(e.target.value),
												})
											}
											className="w-full bg-slate-100 p-4 rounded-xl font-black text-blue-700 border-4 border-slate-200 outline-none"
										/>
									</div>
									<div>
										<label className="text-[10px] font-black text-slate-800 uppercase ml-2 tracking-tighter">
											Intervalo (Min 10s)
										</label>
										<input
											type="number"
											min={10}
											value={newMonitor.cadaCuantoSegundos}
											onChange={(e) =>
												setNewMonitor({
													...newMonitor,
													cadaCuantoSegundos: parseInt(e.target.value),
												})
											}
											className="w-full bg-slate-100 p-4 rounded-xl font-black text-blue-700 border-4 border-slate-200 outline-none"
										/>
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<label className="text-[10px] font-black text-slate-800 uppercase ml-2 tracking-tighter">
											Timeout (Max 30s)
										</label>
										<input
											type="number"
											min={1}
											max={30}
											value={newMonitor.timeOutSegundos}
											onChange={(e) =>
												setNewMonitor({
													...newMonitor,
													timeOutSegundos: parseInt(e.target.value),
												})
											}
											className="w-full bg-slate-100 p-4 rounded-xl font-black text-blue-700 border-4 border-slate-200 outline-none"
										/>
									</div>
									<div>
										<label className="text-[10px] font-black text-slate-800 uppercase ml-2 tracking-tighter">
											Umbral de Reintentos
										</label>
										<input
											type="number"
											min={0}
											max={10}
											value={newMonitor.umbralReintentos}
											onChange={(e) =>
												setNewMonitor({
													...newMonitor,
													umbralReintentos: parseInt(e.target.value),
												})
											}
											className="w-full bg-slate-100 p-4 rounded-xl font-black text-blue-700 border-4 border-slate-200 outline-none"
										/>
									</div>
								</div>
							</div>

							<div className="flex gap-4 pt-6">
								<button
									type="submit"
									disabled={creating}
									className="flex-1 bg-blue-700 text-white py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-slate-950 transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] active:scale-95 disabled:opacity-50"
								>
									{creating ? "DESPLEGANDO..." : "DESPLEGAR SONDA"}
								</button>
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="px-8 bg-slate-200 text-slate-800 py-6 rounded-3xl font-black text-[13px] uppercase hover:bg-slate-300 transition-all"
								>
									ABORTAR
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}
