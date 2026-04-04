"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TipoDispositivo {
	idtipodispositivo: number;
	nombre: string;
	descripcion: string;
}

interface Maquina {
	idmaquina: number;
	nombre: string;
}

export default function CreateDevicePage() {
	const router = useRouter();

	const [formData, setFormData] = useState({
		nombre: "",
		idTipoDispositivo: "",
		idMaquina: "",
		puntoMontaje: "",
		capacidad: "",
		capacidadUsada: "0",
		tecnologia: "",
	});

	const [tipos, setTipos] = useState<TipoDispositivo[]>([]);
	const [maquinas, setMaquinas] = useState<Maquina[]>([]);
	const [loading, setLoading] = useState(false);
	const [fetchingData, setFetchingData] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

				const [resTipos, resMaquinas] = await Promise.all([
					fetch(`${apiUrl}/api/dispositivos/tipos`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${apiUrl}/api/maquina?limit=1000`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

				if (!resTipos.ok || !resMaquinas.ok)
					throw new Error("Error al obtener catálogos");

				const dataTipos = await resTipos.json();
				const dataMaquinas = await resMaquinas.json();

				// Tipos: Suelen venir en .tipos
				setTipos(dataTipos.tipos || []);

				// MÁQUINAS: Lógica robusta para detectar el array
				// Si dataMaquinas es un array, lo usamos. Si tiene .info y es array, lo usamos.
				// Si tiene .info.rows, lo usamos.
				let listaMaquinas: Maquina[] = [];
				if (Array.isArray(dataMaquinas)) {
					listaMaquinas = dataMaquinas;
				} else if (Array.isArray(dataMaquinas.info)) {
					listaMaquinas = dataMaquinas.info;
				} else if (
					dataMaquinas.info?.rows &&
					Array.isArray(dataMaquinas.info.rows)
				) {
					listaMaquinas = dataMaquinas.info.rows;
				}

				setMaquinas(listaMaquinas);
			} catch (err: any) {
				setError("Error al cargar los datos necesarios");
				console.error(err);
			} finally {
				setFetchingData(false);
			}
		};
		fetchData();
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

			const payload = {
				nombre: formData.nombre.trim(),
				idTipoDispositivo: Number(formData.idTipoDispositivo),
				idMaquina: formData.idMaquina ? Number(formData.idMaquina) : null,
				puntoMontaje: formData.puntoMontaje.trim() || null,
				capacidad: formData.capacidad ? Number(formData.capacidad) : null,
				capacidadUsada: formData.capacidadUsada
					? Number(formData.capacidadUsada)
					: 0,
				tecnologia: formData.tecnologia.trim() || null,
			};

			const res = await fetch(`${apiUrl}/api/dispositivos`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok)
				throw new Error(data.error || "Error al crear el dispositivo");

			setSuccess("Dispositivo registrado con éxito");
			setTimeout(() => router.push("/dashboard/dispositivos"), 1500);
		} catch (err: any) {
			setError(err.message);
			setLoading(false);
		}
	};

	if (fetchingData)
		return (
			<div className="h-screen flex items-center justify-center font-black text-slate-400 animate-pulse uppercase text-[10px] tracking-widest">
				Cargando dependencias...
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-5xl mx-auto">
				<button
					onClick={() => router.back()}
					className="mb-8 text-xs font-black tracking-widest text-slate-400 hover:text-blue-600 transition-colors uppercase"
				>
					← Volver
				</button>

				<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					<div className="bg-slate-900 p-16">
						<h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
							Nuevo Dispositivo <span className="text-blue-500">+</span>
						</h1>
						<p className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">
							Registro en inventario central
						</p>
					</div>

					<div className="p-16">
						{error && (
							<div className="bg-red-50 border-2 border-red-100 text-red-600 p-6 rounded-3xl mb-10 font-black text-[10px] uppercase tracking-widest">
								⚠️ {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-6 rounded-3xl mb-10 font-black text-[10px] uppercase tracking-widest">
								✅ {success}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-16">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
								<div className="space-y-8">
									<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
										<span className="w-8 h-[2px] bg-blue-600"></span> Identidad
									</h3>

									<div className="space-y-3">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
											Nombre *
										</label>
										<input
											required
											type="text"
											value={formData.nombre}
											onChange={(e) =>
												setFormData({ ...formData, nombre: e.target.value })
											}
											className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
										/>
									</div>

									<div className="space-y-3">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
											Tipo de Dispositivo *
										</label>
										<select
											required
											value={formData.idTipoDispositivo}
											onChange={(e) =>
												setFormData({
													...formData,
													idTipoDispositivo: e.target.value,
												})
											}
											className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
										>
											<option value="">Seleccionar tipo...</option>
											{tipos.map((t, idx) => (
												<option
													key={idx}
													value={t.idtipodispositivo || idx + 1}
												>
													{t.nombre}
												</option>
											))}
										</select>
									</div>

									<div className="space-y-3">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
											Vincular a Máquina (Opcional)
										</label>
										<select
											value={formData.idMaquina}
											onChange={(e) =>
												setFormData({ ...formData, idMaquina: e.target.value })
											}
											className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
										>
											<option value="">Standalone / Ninguna</option>
											{maquinas.map((m) => (
												<option key={m.idmaquina} value={m.idmaquina}>
													{m.nombre}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="space-y-8">
									<h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
										<span className="w-8 h-[2px] bg-slate-900"></span>{" "}
										Especificaciones
									</h3>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-3">
											<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
												Capacidad (GB)
											</label>
											<input
												type="number"
												value={formData.capacidad}
												onChange={(e) =>
													setFormData({
														...formData,
														capacidad: e.target.value,
													})
												}
												className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
											/>
										</div>
										<div className="space-y-3">
											<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
												Uso Inicial (GB)
											</label>
											<input
												type="number"
												value={formData.capacidadUsada}
												onChange={(e) =>
													setFormData({
														...formData,
														capacidadUsada: e.target.value,
													})
												}
												className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
											/>
										</div>
									</div>

									<div className="space-y-3">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
											Punto de Montaje
										</label>
										<input
											type="text"
											placeholder="/mnt/data"
											value={formData.puntoMontaje}
											onChange={(e) =>
												setFormData({
													...formData,
													puntoMontaje: e.target.value,
												})
											}
											className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
										/>
									</div>

									<div className="space-y-3">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
											Tecnología / Protocolo
										</label>
										<input
											type="text"
											placeholder="NVMe / SATA / LTO"
											value={formData.tecnologia}
											onChange={(e) =>
												setFormData({ ...formData, tecnologia: e.target.value })
											}
											className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50/50 font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
										/>
									</div>
								</div>
							</div>

							<div className="pt-10 flex flex-col md:flex-row gap-6">
								<button
									type="submit"
									disabled={loading}
									className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50 border-b-4 border-black"
								>
									{loading ? "CONFIGURANDO..." : "REGISTRAR DISPOSITIVO"}
								</button>
								<button
									type="button"
									onClick={() => router.back()}
									className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[2rem] font-black text-xs tracking-[0.3em] hover:bg-slate-200 transition-all border-b-4 border-slate-200"
								>
									CANCELAR
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
