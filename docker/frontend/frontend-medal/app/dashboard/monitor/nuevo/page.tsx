"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/backButton/BackButton";

interface MetodoMonitorizar {
	idmetodo: number;
	nombre: string;
	alias: string;
	descripcion: string;
}

export default function NuevoMonitorPage() {
	const router = useRouter();
	const [metodos, setMetodos] = useState<MetodoMonitorizar[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [formData, setFormData] = useState({
		nombreObjetivo: "",
		direccion: "",
		valorEsperado: 200,
		timeOutSegundos: 5,
		umbralReintentos: 3,
		idMetodo: 0,
		cadaCuantoSegundos: 60,
	});

	// Carga inicial de métodos de monitorización
	useEffect(() => {
		const fetchMetodos = async () => {
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			try {
				const res = await fetch(`${baseUrl}/api/monitor/metodosMonitorizar`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await res.json();
				if (res.ok) {
					const lista = data.metodos || [];
					setMetodos(lista);
					if (lista.length > 0) {
						setFormData((prev) => ({ ...prev, idMetodo: lista[0].idmetodo }));
					}
				}
			} catch (err) {
				console.error("Error al obtener métodos:", err);
			}
		};
		fetchMetodos();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		// Mapeo y casting estricto para cumplir con Joi Schema
		const payload = {
			nombreObjetivo: formData.nombreObjetivo.trim(),
			direccion: formData.direccion.trim(),
			valorEsperado: Number(formData.valorEsperado),
			timeOutSegundos: Number(formData.timeOutSegundos),
			umbralReintentos: Number(formData.umbralReintentos),
			idMetodo: Number(formData.idMetodo),
			cadaCuantoSegundos: Number(formData.cadaCuantoSegundos),
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

			const data = await res.json();

			if (res.status === 201) {
				router.push("/dashboard/monitor");
			} else {
				setError(
					data.error || data.message || "Error al procesar la solicitud.",
				);
			}
		} catch (err) {
			setError("No se pudo conectar con el servidor de monitoreo.");
		} finally {
			setLoading(false);
		}
	};

	const descripcionMetodo = useMemo(() => {
		return metodos.find((m) => m.idmetodo === formData.idMetodo)?.descripcion;
	}, [formData.idMetodo, metodos]);

	return (
		<div className="min-h-screen bg-slate-50/50 py-16 px-6 font-sans antialiased text-slate-900">
			<div className="max-w-3xl mx-auto">
				<div className="mb-6">
					<BackButton />
				</div>

				<form
					onSubmit={handleSubmit}
					className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm space-y-10"
				>
					<div className="space-y-2">
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">
							Nueva Sonda de Monitoreo
						</h1>
						<p className="text-sm text-slate-500">
							Configure un nuevo objetivo para supervisión automática de
							disponibilidad.
						</p>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium italic">
							⚠️ {error}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{/* Nombre Objetivo (3-50 chars) */}
						<div className="md:col-span-2 space-y-2">
							<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
								Nombre del Objetivo
							</label>
							<input
								required
								minLength={3}
								maxLength={50}
								type="text"
								placeholder="Ej: API Servicio de Ollama."
								className="w-full bg-white border border-slate-300 p-3 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
								value={formData.nombreObjetivo}
								onChange={(e) =>
									setFormData({ ...formData, nombreObjetivo: e.target.value })
								}
							/>
						</div>

						{/* Dirección URL */}
						<div className="md:col-span-2 space-y-2">
							<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
								Dirección (HTTP/HTTPS)
							</label>
							<input
								required
								type="url"
								placeholder="https://servidor.com/health"
								className="w-full bg-white border border-slate-300 p-3 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
								value={formData.direccion}
								onChange={(e) =>
									setFormData({ ...formData, direccion: e.target.value })
								}
							/>
						</div>

						{/* Método */}
						<div className="md:col-span-2 space-y-2">
							<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
								Método de Validación
							</label>
							<select
								value={formData.idMetodo}
								className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
								onChange={(e) =>
									setFormData({ ...formData, idMetodo: Number(e.target.value) })
								}
							>
								{metodos.map((m) => (
									<option key={m.idmetodo} value={m.idmetodo}>
										{m.nombre}
									</option>
								))}
							</select>
							{descripcionMetodo && (
								<p className="text-[11px] text-slate-500 italic mt-2 px-1">
									Info: {descripcionMetodo}
								</p>
							)}
						</div>

						{/* Parámetros Técnicos */}
						<div className="space-y-6">
							<div className="space-y-2">
								<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Código HTTP Esperado
								</label>
								<input
									type="number"
									min={100}
									max={599}
									className="w-full border border-slate-300 p-3 rounded-lg outline-none"
									value={formData.valorEsperado}
									onChange={(e) =>
										setFormData({
											...formData,
											valorEsperado: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Intervalo (Segundos)
								</label>
								<input
									type="number"
									min={10}
									className="w-full border border-slate-300 p-3 rounded-lg outline-none"
									value={formData.cadaCuantoSegundos}
									onChange={(e) =>
										setFormData({
											...formData,
											cadaCuantoSegundos: Number(e.target.value),
										})
									}
								/>
							</div>
						</div>

						<div className="space-y-6">
							<div className="space-y-2">
								<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Timeout (1-30 seg)
								</label>
								<input
									type="number"
									min={1}
									max={30}
									className="w-full border border-slate-300 p-3 rounded-lg outline-none"
									value={formData.timeOutSegundos}
									onChange={(e) =>
										setFormData({
											...formData,
											timeOutSegundos: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Umbral de Reintentos
								</label>
								<input
									type="number"
									min={0}
									max={10}
									className="w-full border border-slate-300 p-3 rounded-lg outline-none"
									value={formData.umbralReintentos}
									onChange={(e) =>
										setFormData({
											...formData,
											umbralReintentos: Number(e.target.value),
										})
									}
								/>
							</div>
						</div>
					</div>

					<div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-6 py-2.5 rounded-lg font-medium text-slate-500 hover:bg-slate-100 transition-colors"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-semibold shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
						>
							{loading ? "Registrando..." : "Crear Monitor"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
