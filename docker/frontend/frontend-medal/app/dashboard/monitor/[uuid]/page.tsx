"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";

// --- INTERFACES ---
interface MonitorDetalle {
	uuidmonitoreo: string;
	nombreobjetivo: string;
	direccion: string;
	valorultimarespuesta: number | null;
	valoresperado: number;
	contadorfallos: number;
	timeoutsegundos: number;
	cadacuantosegundos: number;
	fechaverificacion: string | null;
	proxima_ejecucion: string;
	responsable_nombre: string;
	responsable_email: string;
	uuidusuario: string; // UUID del dueño del monitor
	metodo_http: string;
	ultimo_estado_disponible: boolean | null;
	ultimo_codigo_http: number | null;
	ultima_respuesta_fecha: string | null;
}

interface HistoricoPunto {
	fecha: string;
	disponible: boolean;
	resultado: number; // Aquí recibimos el código HTTP (ej: 200)
}

export default function DetalleMonitorPage() {
	const router = useRouter();
	const { uuid } = useParams();

	const [monitor, setMonitor] = useState<MonitorDetalle | null>(null);
	const [historico, setHistorico] = useState<HistoricoPunto[]>([]);
	const [suscrito, setSuscrito] = useState<boolean>(false);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	// Obtener el UUID del usuario logueado desde localStorage
	const currentUserUuid =
		typeof window !== "undefined" ? localStorage.getItem("uuidUser") : null;

	const fetchData = useCallback(async () => {
		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		try {
			const headers = { Authorization: `Bearer ${token}` };

			// Peticiones paralelas para optimizar tiempos de carga
			const [resInfo, resHist, resSusc] = await Promise.all([
				fetch(`${baseUrl}/api/monitor/${uuid}`, { headers }),
				fetch(`${baseUrl}/api/monitor/${uuid}/historico`, { headers }),
				fetch(`${baseUrl}/api/monitor/${uuid}/estadoSuscripcion`, { headers }),
			]);

			const dataInfo = await resInfo.json();
			const dataHist = await resHist.json();
			const dataSusc = await resSusc.json();

			if (resInfo.ok) setMonitor(dataInfo.info);
			if (resHist.ok) setHistorico(dataHist.info.historico || []);
			if (resSusc.ok) setSuscrito(dataSusc.suscrito);
		} catch (error) {
			console.error("Error en la sincronización:", error);
		} finally {
			setLoading(false);
		}
	}, [uuid]);

	// Configuración del refresco cada 60 segundos
	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 60000);
		return () => clearInterval(interval);
	}, [fetchData]);

	// Manejo de suscripciones
	const handleSuscripcion = async () => {
		setActionLoading(true);
		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
		const endpoint = suscrito ? "desuscribirse" : "suscribirse";

		try {
			const res = await fetch(`${baseUrl}/api/monitor/${uuid}/${endpoint}`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) setSuscrito(!suscrito);
		} catch (error) {
			console.error("Error en la acción de suscripción");
		} finally {
			setActionLoading(false);
		}
	};

	// Cálculo de Uptime real sobre el histórico
	const uptimeStats = useMemo(() => {
		if (historico.length === 0) return { porcentaje: "0", total: 0 };
		const exitos = historico.filter((p) => p.disponible).length;
		return {
			porcentaje: ((exitos / historico.length) * 100).toFixed(2),
			total: historico.length,
		};
	}, [historico]);

	// Validación de propiedad
	const esDuenio = monitor?.uuidusuario === currentUserUuid;

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-50">
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
			</div>
		);

	if (!monitor)
		return (
			<div className="p-20 text-center text-slate-500">
				Monitor no encontrado
			</div>
		);

	return (
		<div className="min-h-screen bg-slate-50/50 py-12 px-8 font-sans antialiased text-slate-900">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* --- HEADER --- */}
				<div className="flex flex-col md:flex-row justify-between items-start gap-6">
					<div className="flex-1">
						<button
							onClick={() => router.back()}
							className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 mb-4 flex items-center gap-1 transition-colors"
						>
							← Volver al Panel
						</button>
						<div className="flex items-center gap-4 flex-wrap">
							<h1 className="text-3xl font-bold text-slate-900 tracking-tight">
								{monitor.nombreobjetivo}
							</h1>
							<span
								className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${monitor.ultimo_estado_disponible ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
							>
								{monitor.ultimo_estado_disponible ? "Online" : "Offline"}
							</span>

							{esDuenio ? (
								<span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">
									Propietario
								</span>
							) : (
								<button
									onClick={handleSuscripcion}
									disabled={actionLoading}
									className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${
										suscrito
											? "bg-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent"
											: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
									}`}
								>
									{actionLoading
										? "..."
										: suscrito
											? "Dejar de seguir"
											: "Seguir servicio"}
								</button>
							)}
						</div>
						<p className="text-slate-500 font-mono text-xs mt-3 bg-white/50 inline-block px-2 py-1 rounded border border-slate-100">
							{monitor.direccion}
						</p>
					</div>

					{/* MÉTRICAS RÁPIDAS */}
					<div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-8">
						<div className="text-center">
							<p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
								Uptime Global
							</p>
							<p
								className={`text-2xl font-black ${Number(uptimeStats.porcentaje) > 98 ? "text-emerald-600" : "text-amber-600"}`}
							>
								{uptimeStats.porcentaje}%
							</p>
						</div>
						<div className="h-10 border-l border-slate-100"></div>
						<div className="text-center">
							<p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
								Status Actual
							</p>
							<p
								className={`text-2xl font-black ${monitor.ultimo_estado_disponible ? "text-slate-800" : "text-red-600"}`}
							>
								{monitor.ultimo_codigo_http || "---"}
							</p>
						</div>
					</div>
				</div>

				{/* --- LÍNEA DE TIEMPO (90 BLOQUES) --- */}
				<div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
							Línea de tiempo
						</h2>
						<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
							<span className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
							Sincronización: 60s
						</span>
					</div>
					<div className="flex gap-1 h-12">
						{historico
							.slice(0, 90)
							.reverse()
							.map((h, i) => (
								<div
									key={i}
									title={`${new Date(h.fecha).toLocaleString()} - ${h.resultado}`}
									className={`flex-1 rounded-sm transition-all hover:scale-150 cursor-crosshair ${h.disponible ? "bg-emerald-400" : "bg-red-500"}`}
								/>
							))}
					</div>
				</div>

				{/* --- INFORMACIÓN DETALLADA --- */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest border-b pb-2">
							Responsable
						</h3>
						<p className="text-sm font-bold text-slate-800">
							{monitor.responsable_nombre}
						</p>
						<p className="text-xs text-blue-600 font-medium truncate mb-4">
							{monitor.responsable_email}
						</p>
						<div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
							<p className="text-[9px] text-slate-400 font-bold uppercase">
								Próxima Ejecución
							</p>
							<p className="text-xs font-bold text-slate-700">
								{new Date(monitor.proxima_ejecucion).toLocaleTimeString()}
							</p>
						</div>
					</div>

					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest border-b pb-2">
							Configuración
						</h3>
						<div className="space-y-3 text-sm font-bold text-slate-800">
							<div className="flex justify-between">
								<span className="text-[9px] text-slate-400 uppercase">
									Método
								</span>
								{monitor.metodo_http}
							</div>
							<div className="flex justify-between">
								<span className="text-[9px] text-slate-400 uppercase">
									Frecuencia
								</span>
								{monitor.cadacuantosegundos}s
							</div>
							<div className="flex justify-between">
								<span className="text-[9px] text-slate-400 uppercase">
									Timeout
								</span>
								{monitor.timeoutsegundos}s
							</div>
							<div className="flex justify-between">
								<span className="text-[9px] text-slate-400 uppercase">
									Esperado
								</span>
								<span className="text-blue-600">
									HTTP {monitor.valoresperado}
								</span>
							</div>
						</div>
					</div>

					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest border-b pb-2">
							Último Check
						</h3>
						<div className="flex justify-between items-center mb-4">
							<p
								className={`text-4xl font-black ${monitor.ultimo_estado_disponible ? "text-emerald-600" : "text-red-600"}`}
							>
								{monitor.ultimo_codigo_http || "---"}
							</p>
							<p className="text-xs font-bold text-slate-700">
								{monitor.ultima_respuesta_fecha
									? new Date(
											monitor.ultima_respuesta_fecha,
										).toLocaleTimeString()
									: "N/A"}
							</p>
						</div>
						<p className="text-[11px] text-slate-500 italic">
							Petición verificada el{" "}
							{monitor.fechaverificacion
								? new Date(monitor.fechaverificacion).toLocaleDateString()
								: "En proceso"}
						</p>
					</div>
				</div>

				{/* --- TABLA DE LOGS FUNCIONAL --- */}
				<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
					<div className="p-6 border-b flex justify-between items-center">
						<h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
							Logs Recientes
						</h3>
						<span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">
							Total: {uptimeStats.total} muestras
						</span>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-left">
							<thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b">
								<tr>
									<th className="px-8 py-4">Fecha y Hora</th>
									<th className="px-8 py-4">Estado</th>
									<th className="px-8 py-4">Código Respuesta</th>
								</tr>
							</thead>
							<tbody className="divide-y text-xs">
								{historico.slice(0, 20).map((h, i) => (
									<tr
										key={i}
										className="hover:bg-slate-50/50 transition-colors"
									>
										<td className="px-8 py-4 text-slate-600">
											{new Date(h.fecha).toLocaleString()}
										</td>
										<td className="px-8 py-4">
											<span
												className={`px-2 py-1 rounded font-bold text-[9px] uppercase border ${h.disponible ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}
											>
												{h.disponible ? "✓ Accesible" : "✗ Fallo"}
											</span>
										</td>
										<td className="px-8 py-4 font-mono">
											<span
												className={
													h.disponible
														? "text-slate-500"
														: "text-red-600 font-bold"
												}
											>
												{h.resultado ? `HTTP ${h.resultado}` : "TIMEOUT"}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
