"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/backButton/BackButton";

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

				setTipos(dataTipos.tipos || []);

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
			<div className="h-screen bg-[#F1F5F9] flex items-center justify-center font-black text-slate-950 animate-pulse uppercase text-[11px] tracking-[0.4em]">
				Sincronizando Catálogos...
			</div>
		);

	const inputStyle =
		"w-full p-5 border-2 border-slate-200 rounded-2xl bg-white font-black text-sm text-slate-950 focus:border-blue-700 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-300 shadow-sm";
	const labelStyle =
		"text-slate-950 text-[10px] font-black uppercase tracking-widest ml-4 mb-2 block";

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<BackButton />
				</div>

				<div className="bg-white rounded-[4rem] shadow-2xl shadow-slate-300/50 overflow-hidden border-2 border-white">
					{/* HEADER */}
					<div className="bg-slate-950 p-16 border-b-[12px] border-blue-800">
						<h1 className="text-6xl font-black text-white tracking-tighter uppercase mb-2">
							Nuevo
							<br />
							<span className="text-blue-500">Dispositivo.</span>
						</h1>
						<p className="text-[10px] font-black text-blue-400 tracking-[0.5em] uppercase italic">
							Hardware Provisioning System
						</p>
					</div>

					<div className="p-16">
						{error && (
							<div className="bg-red-600 text-white p-6 rounded-[2rem] mb-10 font-black text-[10px] uppercase tracking-widest shadow-xl animate-pulse flex items-center gap-4">
								<span className="text-2xl">!</span> {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-500 text-white p-6 rounded-[2rem] mb-10 font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-4">
								<span className="text-2xl">✓</span> {success}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-16">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
								{/* COLUMNA 1 */}
								<div className="space-y-10">
									<h3 className="text-blue-700 font-black text-[12px] uppercase tracking-[0.4em] flex items-center gap-4 italic">
										<span className="w-12 h-1 bg-blue-700"></span> Identidad
									</h3>

									<div className="space-y-1">
										<label className={labelStyle}>Hostname / Etiqueta *</label>
										<input
											required
											type="text"
											value={formData.nombre}
											onChange={(e) =>
												setFormData({ ...formData, nombre: e.target.value })
											}
											className={inputStyle}
										/>
									</div>

									<div className="space-y-1">
										<label className={labelStyle}>Categoría Hardware *</label>
										<select
											required
											value={formData.idTipoDispositivo}
											onChange={(e) =>
												setFormData({
													...formData,
													idTipoDispositivo: e.target.value,
												})
											}
											className={inputStyle}
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

									<div className="space-y-1">
										<label className={labelStyle}>
											Host Asignado (Opcional)
										</label>
										<select
											value={formData.idMaquina}
											onChange={(e) =>
												setFormData({ ...formData, idMaquina: e.target.value })
											}
											className={`${inputStyle} text-blue-700`}
										>
											<option value="">STANDALONE ASSET</option>
											{maquinas.map((m) => (
												<option key={m.idmaquina} value={m.idmaquina}>
													{m.nombre}
												</option>
											))}
										</select>
									</div>
								</div>

								{/* COLUMNA 2 */}
								<div className="space-y-10">
									<h3 className="text-slate-950 font-black text-[12px] uppercase tracking-[0.4em] flex items-center gap-4 italic">
										<span className="w-12 h-1 bg-slate-950"></span> Specs
									</h3>

									<div className="grid grid-cols-2 gap-6">
										<div className="space-y-1">
											<label className={labelStyle}>Total (GB)</label>
											<input
												type="number"
												value={formData.capacidad}
												onChange={(e) =>
													setFormData({
														...formData,
														capacidad: e.target.value,
													})
												}
												className={inputStyle}
											/>
										</div>
										<div className="space-y-1">
											<label className={labelStyle}>Uso (GB)</label>
											<input
												type="number"
												value={formData.capacidadUsada}
												onChange={(e) =>
													setFormData({
														...formData,
														capacidadUsada: e.target.value,
													})
												}
												className={inputStyle}
											/>
										</div>
									</div>

									<div className="space-y-1">
										<label className={labelStyle}>
											Punto de Montaje / Path
										</label>
										<input
											type="text"
											placeholder="/dev/sdb1"
											value={formData.puntoMontaje}
											onChange={(e) =>
												setFormData({
													...formData,
													puntoMontaje: e.target.value,
												})
											}
											className={`${inputStyle} font-mono text-xs`}
										/>
									</div>

									<div className="space-y-1">
										<label className={labelStyle}>Interfaz / Tecnología</label>
										<input
											type="text"
											placeholder="NVMe Gen4 / Fiber Channel"
											value={formData.tecnologia}
											onChange={(e) =>
												setFormData({ ...formData, tecnologia: e.target.value })
											}
											className={inputStyle}
										/>
									</div>
								</div>
							</div>

							{/* ACCIONES */}
							<div className="pt-12 flex flex-col md:flex-row gap-6">
								<button
									type="submit"
									disabled={loading}
									className={`flex-[2] py-10 rounded-[2.5rem] font-black text-base tracking-[0.6em] transition-all border-b-[10px] ${
										loading
											? "bg-slate-100 text-slate-400 border-slate-200"
											: "bg-slate-950 text-white border-blue-900 hover:bg-blue-700 active:scale-[0.97] shadow-2xl"
									}`}
								>
									{loading ? "PROCESANDO..." : "CONFIRMAR REGISTRO"}
								</button>
								<button
									type="button"
									onClick={() => router.back()}
									className="flex-1 bg-white text-slate-500 py-10 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.3em] hover:text-red-600 transition-all border-2 border-slate-200"
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
