"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

interface Puerto {
	id?: number;
	puerto: number; // El GET lo trae como 'puerto'
	protocolo: string;
	nombre: string; // El GET lo trae como 'nombre'
}

interface PuertoBackend {
	numeroPuertoMaquina: number;
	protocolo: string;
	nombreServicio: string;
	puertoVirtual: number;
}

interface ServicioInfo {
	idservicio: number;
	uuidservicio: string;
	nombreservicio: string;
	descripciontecnica: string;
	entorno: string;
	publico: boolean;
	softwarebase: string;
	nivelseveridad: string;
	uuidpeticion: string;
	uuidmaquina: string;
	status: string;
	lista_puertos: Puerto[];
}

export default function DetalleServicioEspecifico() {
	const params = useParams();
	const router = useRouter();
	const uuidMaquina = params?.uuid as string;
	const uuidServicio = params?.uuidServicio as string;

	const [servicio, setServicio] = useState<ServicioInfo | null>(null);
	// Estado local para los puertos en edición
	const [puertosEdit, setPuertosEdit] = useState<PuertoBackend[]>([]);
	const [loading, setLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		return JSON.parse(localStorage.getItem("permisos") || "[]");
	}, []);

	const esAdmin = permisos.includes("admin:total");
	const puedeEditar =
		esAdmin || permisos.includes(`maquina:crearServicios:${uuidMaquina}`);

	const fetchServicio = useCallback(async () => {
		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
		try {
			const res = await fetch(
				`${baseUrl}/api/maquina/${uuidMaquina}/servicios/${uuidServicio}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const data = await res.json();
			if (res.ok) {
				setServicio(data.info);
				// Mapeamos los puertos actuales al formato de edición
				const initialPuertos = data.info.lista_puertos.map((p: Puerto) => ({
					numeroPuertoMaquina: p.puerto,
					protocolo: p.protocolo,
					nombreServicio: p.nombre,
					puertoVirtual: p.puerto, // Default al mismo puerto si no viene del GET
				}));
				setPuertosEdit(initialPuertos);
			}
		} finally {
			setLoading(false);
		}
	}, [uuidMaquina, uuidServicio]);

	useEffect(() => {
		if (uuidMaquina && uuidServicio) fetchServicio();
	}, [fetchServicio]);

	const addPuerto = () => {
		setPuertosEdit([
			...puertosEdit,
			{
				numeroPuertoMaquina: 0,
				protocolo: "TCP",
				nombreServicio: "",
				puertoVirtual: 0,
			},
		]);
	};

	const removePuerto = (index: number) => {
		setPuertosEdit(puertosEdit.filter((_, i) => i !== index));
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!servicio) return;
		setSaving(true);

		try {
			const body = {
				nombreServicio: servicio.nombreservicio,
				descripcionTecnica: servicio.descripciontecnica,
				entorno: servicio.entorno,
				publico: servicio.publico,
				softwareBase: servicio.softwarebase,
				nivelSeveridad: servicio.nivelseveridad,
				status: servicio.status,
				puertosAbiertos: puertosEdit, // Enviamos el array con el formato solicitado
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuidMaquina}/servicios/${uuidServicio}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
					body: JSON.stringify(body),
				},
			);

			if (res.ok) {
				setIsEditing(false);
				fetchServicio();
			}
		} finally {
			setSaving(false);
		}
	};

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse">
				CARGANDO NODO...
			</div>
		);
	if (!servicio) return null;

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<div className="flex justify-between items-end mb-16 border-b-2 border-slate-100 pb-12">
					<div>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase mb-4 block hover:text-blue-600"
						>
							[ ← Regresar ]
						</button>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							{servicio.nombreservicio}
						</h1>
					</div>
					{puedeEditar && !isEditing && (
						<button
							onClick={() => setIsEditing(true)}
							className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all"
						>
							Configurar Servicio
						</button>
					)}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
					{/* ASIDE: INFORMACIÓN FIJA */}
					<div className="space-y-6">
						<div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
							<p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 italic">
								Status Actual
							</p>
							<div className="flex items-center gap-3">
								<div
									className={`w-3 h-3 rounded-full ${servicio.status === "working" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
								/>
								<p className="font-black uppercase text-xl italic">
									{servicio.status}
								</p>
							</div>
						</div>

						{/* LISTADO DE PUERTOS (MODO LECTURA) */}
						{!isEditing && (
							<div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
								<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
									Puertos en Escucha
								</p>
								<div className="space-y-3">
									{servicio.lista_puertos.map((p, i) => (
										<div
											key={i}
											className="flex justify-between items-center bg-slate-50 p-4 rounded-xl"
										>
											<span className="font-black text-slate-900">
												{p.puerto}
											</span>
											<span className="text-[9px] font-black bg-slate-200 px-2 py-1 rounded text-slate-500">
												{p.protocolo}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* FORMULARIO PRINCIPAL */}
					<div className="lg:col-span-2">
						<form
							onSubmit={handleSave}
							className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10"
						>
							{/* CAMPOS DE TEXTO */}
							<div className="grid grid-cols-1 gap-8">
								<div className="space-y-2">
									<label className="text-[9px] font-black text-slate-400 uppercase ml-1">
										Descripción
									</label>
									{isEditing ? (
										<textarea
											value={servicio.descripciontecnica}
											onChange={(e) =>
												setServicio({
													...servicio,
													descripciontecnica: e.target.value,
												})
											}
											className="w-full p-5 bg-slate-50 border-2 border-blue-500/10 rounded-2xl font-bold focus:bg-white outline-none transition-all min-h-[100px]"
										/>
									) : (
										<p className="p-5 bg-slate-50 rounded-2xl font-bold text-slate-600 italic">
											"{servicio.descripciontecnica}"
										</p>
									)}
								</div>

								<div className="grid grid-cols-2 gap-6">
									<div className="space-y-2">
										<label className="text-[9px] font-black text-slate-400 uppercase">
											Entorno
										</label>
										{isEditing ? (
											<select
												value={servicio.entorno}
												onChange={(e) =>
													setServicio({ ...servicio, entorno: e.target.value })
												}
												className="w-full p-5 bg-slate-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-blue-500"
											>
												<option value="PROD">PROD</option>
												<option value="DEV">DEV</option>
												<option value="TEST">TEST</option>
											</select>
										) : (
											<p className="p-5 bg-slate-50 rounded-2xl font-black text-blue-600">
												{servicio.entorno}
											</p>
										)}
									</div>
									<div className="space-y-2">
										<label className="text-[9px] font-black text-slate-400 uppercase">
											Severidad
										</label>
										{isEditing ? (
											<select
												value={servicio.nivelseveridad}
												onChange={(e) =>
													setServicio({
														...servicio,
														nivelseveridad: e.target.value,
													})
												}
												className="w-full p-5 bg-slate-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-blue-500"
											>
												<option value="bajo">BAJO</option>
												<option value="medio">MEDIO</option>
												<option value="alto">ALTO</option>
											</select>
										) : (
											<p className="p-5 bg-slate-50 rounded-2xl font-black text-slate-900 uppercase">
												{servicio.nivelseveridad}
											</p>
										)}
									</div>
								</div>

								{/* SELECTOR DE STATUS - SOLO EN EDICIÓN */}
								{isEditing && (
									<div className="space-y-2">
										<label className="text-[9px] font-black text-slate-400 uppercase">
											Cambiar Status Operativo
										</label>
										<select
											value={servicio.status}
											onChange={(e) =>
												setServicio({ ...servicio, status: e.target.value })
											}
											className="w-full p-5 bg-orange-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-orange-200"
										>
											<option value="working">Working</option>
											<option value="stopped">Stopped</option>
											<option value="error">Error</option>
										</select>
									</div>
								)}
							</div>

							{/* GESTIÓN DE PUERTOS - SOLO EN EDICIÓN */}
							{isEditing && (
								<div className="pt-10 border-t border-slate-100 space-y-6">
									<div className="flex justify-between items-center">
										<h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
											Configuración de Puertos
										</h4>
										<button
											type="button"
											onClick={addPuerto}
											className="text-[9px] font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
										>
											+ Añadir Puerto
										</button>
									</div>
									<div className="space-y-4">
										{puertosEdit.map((p, index) => (
											<div
												key={index}
												className="grid grid-cols-12 gap-4 bg-slate-50 p-4 rounded-2xl items-end"
											>
												<div className="col-span-3">
													<label className="text-[7px] font-black text-slate-400 uppercase block mb-1">
														Puerto Host
													</label>
													<input
														type="number"
														value={p.numeroPuertoMaquina}
														onChange={(e) => {
															const newPuertos = [...puertosEdit];
															newPuertos[index].numeroPuertoMaquina = parseInt(
																e.target.value,
															);
															setPuertosEdit(newPuertos);
														}}
														className="w-full p-2 bg-white rounded-lg font-black text-xs border border-slate-200 outline-none"
													/>
												</div>
												<div className="col-span-3">
													<label className="text-[7px] font-black text-slate-400 uppercase block mb-1">
														Nombre/App
													</label>
													<input
														type="text"
														value={p.nombreServicio}
														onChange={(e) => {
															const newPuertos = [...puertosEdit];
															newPuertos[index].nombreServicio = e.target.value;
															setPuertosEdit(newPuertos);
														}}
														className="w-full p-2 bg-white rounded-lg font-black text-xs border border-slate-200 outline-none"
													/>
												</div>
												<div className="col-span-3">
													<label className="text-[7px] font-black text-slate-400 uppercase block mb-1">
														Protocolo
													</label>
													<select
														value={p.protocolo}
														onChange={(e) => {
															const newPuertos = [...puertosEdit];
															newPuertos[index].protocolo = e.target.value;
															setPuertosEdit(newPuertos);
														}}
														className="w-full p-2 bg-white rounded-lg font-black text-[9px] border border-slate-200 outline-none"
													>
														<option value="TCP">TCP</option>
														<option value="UDP">UDP</option>
													</select>
												</div>
												<div className="col-span-2">
													<label className="text-[7px] font-black text-slate-400 uppercase block mb-1">
														Virtual
													</label>
													<input
														type="number"
														value={p.puertoVirtual}
														onChange={(e) => {
															const newPuertos = [...puertosEdit];
															newPuertos[index].puertoVirtual = parseInt(
																e.target.value,
															);
															setPuertosEdit(newPuertos);
														}}
														className="w-full p-2 bg-white rounded-lg font-black text-xs border border-slate-200 outline-none"
													/>
												</div>
												<button
													type="button"
													onClick={() => removePuerto(index)}
													className="col-span-1 p-2 text-red-400 hover:text-red-600"
												>
													×
												</button>
											</div>
										))}
									</div>
								</div>
							)}

							{/* ACCIONES FINALES */}
							{isEditing && (
								<div className="flex gap-4 pt-10 border-t border-slate-100">
									<button
										type="submit"
										disabled={saving}
										className="flex-1 bg-blue-600 text-white py-6 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-900 transition-all shadow-xl"
									>
										{saving ? "SINCRONIZANDO..." : "Sincronizar Cambios"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											fetchServicio();
										}}
										className="px-10 bg-slate-100 text-slate-400 py-6 rounded-2xl font-black text-[10px] uppercase"
									>
										Cancelar
									</button>
								</div>
							)}
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
