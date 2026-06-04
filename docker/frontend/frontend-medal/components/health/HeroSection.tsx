"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Database, Cpu, Globe, RefreshCcw } from "lucide-react";

interface ComponentStatus {
	status: "UP" | "DOWN" | string;
	latency: string;
}

interface HealthResponse {
	status: string;
	service: string;
	uptime: string;
	timestamp: string;
	components: {
		database: ComponentStatus;
		redis: ComponentStatus;
		google_api: ComponentStatus;
	};
}

export default function HealthHeroSection() {
	const [health, setHealth] = useState<HealthResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const checkHealth = useCallback(async () => {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

		try {
			setLoading(true);
			const response = await fetch(`${apiUrl}/api/healthcheck`, {
				cache: "no-store",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) throw new Error("API Unreachable");

			const data: HealthResponse = await response.json();
			setHealth(data);
			setError(false);
		} catch (err) {
			console.error("Health Check Error:", err);
			setError(true);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		checkHealth();
		const timer = setInterval(checkHealth, 60000);
		return () => clearInterval(timer);
	}, [checkHealth]);

	return (
		<section className="relative bg-slate-950 py-24 overflow-hidden">
			{/* Decoración de fondo */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500 blur-[120px] rounded-full" />
			</div>

			<div className="container mx-auto px-6 relative z-10">
				<div className="text-center max-w-4xl mx-auto">
					{/* Badge de Estado General */}
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 mb-8">
						{loading ? (
							<RefreshCcw className="w-4 h-4 text-blue-400 animate-spin" />
						) : (
							<div
								className={`w-2.5 h-2.5 rounded-full ${health?.status === "OK" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
							/>
						)}
						<span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
							{loading
								? "Sincronizando..."
								: `System Status: ${health?.status || "Unknown"}`}
						</span>
					</div>

					<h1 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter leading-none mb-6">
						Operational <span className="text-blue-600">Health</span>
					</h1>

					<p className="text-slate-400 font-medium text-lg mb-12 max-w-2xl mx-auto">
						Monitorización en tiempo real de los servicios críticos, latencia de
						base de datos y conectividad con nodos externos.
					</p>

					{/* GRID DE COMPONENTES */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
						{/* Database */}
						<HealthCard
							title="Base de Datos"
							icon={<Database className="w-5 h-5" />}
							status={health?.components.database.status}
							latency={health?.components.database.latency}
							loading={loading}
						/>

						{/* Redis / Cache */}
						<HealthCard
							title="Memoria Caché (Redis)"
							icon={<Cpu className="w-5 h-5" />}
							status={health?.components.redis.status}
							latency={health?.components.redis.latency}
							loading={loading}
						/>

						{/* Google API */}
						<HealthCard
							title="Google External API"
							icon={<Globe className="w-5 h-5" />}
							status={health?.components.google_api.status}
							latency={health?.components.google_api.latency}
							loading={loading}
						/>
					</div>

					{/* Footer del Hero con Metadatos */}
					{!loading && health && (
						<div className="mt-12 flex flex-wrap justify-center gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
							<div className="flex flex-col items-center">
								<span className="text-slate-700 mb-1 text-[8px]">Uptime</span>
								<span className="text-slate-300">{health.uptime}</span>
							</div>
							<div className="flex flex-col items-center border-x border-slate-800 px-8">
								<span className="text-slate-700 mb-1 text-[8px]">
									Service ID
								</span>
								<span className="text-slate-300">{health.service}</span>
							</div>
							<div className="flex flex-col items-center">
								<span className="text-slate-700 mb-1 text-[8px]">
									Last Check
								</span>
								<span className="text-slate-300">
									{new Date(health.timestamp).toLocaleTimeString()}
								</span>
							</div>
						</div>
					)}

					{error && (
						<div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase">
							Error de conexión: No se pudo obtener el estado de salud del
							sistema.
						</div>
					)}
				</div>
			</div>
		</section>
	);
}

function HealthCard({
	title,
	icon,
	status,
	latency,
	loading,
}: {
	title: string;
	icon: React.ReactNode;
	status?: string;
	latency?: string;
	loading: boolean;
}) {
	const isUp = status === "UP" || status === "OK";

	return (
		<div className="p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] hover:border-blue-500/50 transition-all duration-500 group">
			<div className="flex items-center gap-4 mb-4">
				<div className="p-3 bg-slate-800 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
					{icon}
				</div>
				<div>
					<h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
						{title}
					</h3>
					<div className="mt-1 flex items-center gap-2">
						{loading ? (
							<div className="h-4 w-12 bg-slate-800 animate-pulse rounded" />
						) : (
							<span
								className={`text-sm font-bold uppercase ${isUp ? "text-green-400" : "text-red-500"}`}
							>
								{status || "Offline"}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex justify-between items-end border-t border-slate-800 pt-4">
				<span className="text-[9px] font-bold text-slate-600 uppercase">
					Latencia
				</span>
				<span
					className={`text-xs font-mono font-bold ${isUp ? "text-slate-300" : "text-slate-600"}`}
				>
					{loading ? "---" : latency}
				</span>
			</div>
		</div>
	);
}
