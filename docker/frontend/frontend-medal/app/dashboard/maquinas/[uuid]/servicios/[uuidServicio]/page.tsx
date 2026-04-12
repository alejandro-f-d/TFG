"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

// --- INTERFACES ACTUALIZADAS ---
interface Puerto {
	id?: number;
	puerto: number;
	protocolo: string;
	nombre: string;
	puertoVirtual: number; // Unificado con el JSON del backend
}

interface MaquinaInfo {
	idmaquina: number;
	nombre: string;
	direccionipprivadav4: string;
	sistemaoperativo: string;
	esservidor: boolean;
	uuidmaquina: string;
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
	status: string;
	lista_maquinas: string[];
	lista_puertos: Puerto[];
}

export default function DetalleServicioEspecifico() {
	const params = useParams();
	const router = useRouter();
	const uuidMaquinaActual = params?.uuid as string;
	const uuidServicio = params?.uuidServicio as string;

	const [servicio, setServicio] = useState<ServicioInfo | null>(null);
	const [maquinasInfo, setMaquinasInfo] = useState<MaquinaInfo[]>([]);
	const [puertosEdit, setPuertosEdit] = useState<Puerto[]>([]); // Usamos la misma interfaz
	const [loading, setLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("permisos") || "[]");
		} catch {
			return [];
		}
	}, []);

	const esAdminTotal = permisos.includes("admin:total");
	const puedeEditar =
		esAdminTotal ||
		permisos.includes(`maquina:crearServicios:${uuidMaquinaActual}`);
	const puedeBorrar =
		esAdminTotal ||
		permisos.includes(`maquina:borrarServicios:${uuidMaquinaActual}`);

	const fetchData = useCallback(async () => {
		const token = localStorage.getItem("token");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		try {
			setLoading(true);
			const resServ = await fetch(
				`${baseUrl}/api/maquina/${uuidMaquinaActual}/servicios/${uuidServicio}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const dataServ = await resServ.json();

			if (resServ.ok && dataServ.info) {
				const s = dataServ.info as ServicioInfo;
				setServicio(s);

				// Sincronizamos maquinas
				const promesasMaquinas = s.lista_maquinas.map((uuid: string) =>
					fetch(`${baseUrl}/api/maquina/${uuid}`, {
						headers: { Authorization: `Bearer ${token}` },
					}).then((res) => res.json()),
				);

				const resultados = await Promise.all(promesasMaquinas);
				setMaquinasInfo(resultados.filter((r) => r.info).map((r) => r.info));

				// Sincronizamos puertosEdit usando 'puertoVirtual'
				setPuertosEdit(
					s.lista_puertos.map((p) => ({
						id: p.id,
						puerto: p.puerto,
						protocolo: p.protocolo || "TCP",
						nombre: p.nombre,
						puertoVirtual: p.puertoVirtual || p.puerto,
					})),
				);
			}
		} catch (error) {
			console.error("Error sincronizando:", error);
		} finally {
			setLoading(false);
		}
	}, [uuidMaquinaActual, uuidServicio]);

	useEffect(() => {
		if (uuidMaquinaActual && uuidServicio) fetchData();
	}, [fetchData]);

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
				puertosAbiertos: puertosEdit.map((p) => ({
					numeroPuertoMaquina: Number(p.puerto),
					protocolo: p.protocolo,
					nombreServicio: p.nombre,
					puertoVirtual: Number(p.puertoVirtual),
				})),
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuidMaquinaActual}/servicios/${uuidServicio}`,
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
				fetchData();
			}
		} catch (error) {
			console.error("Error al guardar:", error);
		} finally {
			setSaving(false);
		}
	};

	// ... (executeDelete se mantiene igual)
	const executeDelete = async () => {
		setDeleting(true);
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuidMaquinaActual}/servicios/${uuidServicio}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
				},
			);
			if (res.ok) router.push("/dashboard/servicios");
		} finally {
			setDeleting(false);
			setShowDeleteModal(false);
		}
	};

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.5em]">
				Sincronizando...
			</div>
		);
	if (!servicio) return null;

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans relative">
			{/* MODAL DE BORRADO - se mantiene igual */}
			{showDeleteModal && (
				<div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-6">
					<div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-lg w-full text-center border border-slate-100">
						<div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-4xl mb-6 font-black italic">
							!
						</div>
						<h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">
							Confirmar Purga
						</h3>
						<p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-10 leading-relaxed px-4">
							Vas a eliminar permanentemente{" "}
							<span className="text-red-500 underline">
								{servicio.nombreservicio}
							</span>{" "}
							de este clúster.
						</p>
						<div className="flex flex-col gap-3">
							<button
								onClick={executeDelete}
								disabled={deleting}
								className="w-full bg-red-500 text-white py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl"
							>
								{deleting ? "EJECUTANDO..." : "SÍ, ELIMINAR SERVICIO"}
							</button>
							<button
								onClick={() => setShowDeleteModal(false)}
								className="w-full bg-slate-100 text-slate-400 py-6 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="max-w-6xl mx-auto">
				{/* HEADER - se mantiene igual */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-2 border-slate-100 pb-12 gap-6">
					<div>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black text-slate-400 uppercase mb-4 block hover:text-blue-600 tracking-widest"
						>
							[ ← Regresar ]
						</button>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">
							{servicio.nombreservicio}
						</h1>
					</div>
					<div className="flex gap-4">
						{puedeBorrar && !isEditing && (
							<button
								onClick={() => setShowDeleteModal(true)}
								className="bg-red-50 text-red-500 px-8 py-5 rounded-2xl font-black text-[10px] uppercase hover:bg-red-500 transition-all"
							>
								Eliminar
							</button>
						)}
						{puedeEditar && !isEditing && (
							<button
								onClick={() => setIsEditing(true)}
								className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-xl"
							>
								Configurar
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
					{/* ASIDE - se mantiene igual */}
					<div className="space-y-6">
						<div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
							<p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4 italic">
								Core Status
							</p>
							<div className="flex items-center gap-3">
								<div
									className={`w-3 h-3 rounded-full ${servicio.status === "working" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
								/>
								<p className="font-black uppercase text-2xl italic tracking-tighter">
									{servicio.status}
								</p>
							</div>
						</div>

						<div className="space-y-4">
							<p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">
								// Infraestructura Activa ({maquinasInfo.length})
							</p>
							{maquinasInfo.map((maq) => (
								<div
									key={maq.uuidmaquina}
									className={`p-8 rounded-[2.5rem] text-white shadow-xl transition-all ${maq.uuidmaquina === uuidMaquinaActual ? "bg-blue-600 ring-4 ring-blue-100" : "bg-slate-400 opacity-60"}`}
								>
									<p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-4">
										Host Node
									</p>
									<p className="font-black text-xl uppercase leading-none tracking-tighter mb-2">
										{maq.nombre}
									</p>
									<p className="font-mono text-xs font-bold opacity-80">
										{maq.direccionipprivadav4}
									</p>
								</div>
							))}
						</div>
					</div>

					<div className="lg:col-span-2">
						<form
							onSubmit={handleSave}
							className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10"
						>
							{/* ... CAMPOS DE TEXTO se mantienen igual ... */}
							<div className="space-y-8">
								<div className="grid grid-cols-2 gap-8">
									<div className="space-y-2">
										<label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
											Entorno
										</label>
										{isEditing ? (
											<select
												value={servicio.entorno}
												onChange={(e) =>
													setServicio({ ...servicio, entorno: e.target.value })
												}
												className="w-full p-5 bg-slate-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-blue-500 appearance-none"
											>
												<option value="PROD">PRODUCCIÓN</option>
												<option value="DEV">DESARROLLO</option>
												<option value="STAGING">STAGING</option>
											</select>
										) : (
											<div className="p-5 bg-slate-50 rounded-2xl font-black text-slate-900 text-xs tracking-widest uppercase">
												{servicio.entorno}
											</div>
										)}
									</div>
									<div className="space-y-2">
										<label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
											Severidad
										</label>
										<div className="p-5 bg-slate-50 rounded-2xl font-black text-red-600 text-xs tracking-widest uppercase">
											{servicio.nivelseveridad}
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
										Descripción Técnica
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
											className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm focus:bg-white focus:border-blue-500 outline-none transition-all min-h-[120px]"
										/>
									) : (
										<div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
											<p className="text-slate-600 font-medium leading-relaxed italic text-lg italic text-lg">
												"{servicio.descripciontecnica}"
											</p>
										</div>
									)}
								</div>
							</div>

							{/* SECCIÓN PUERTOS ACTUALIZADA */}
							<div className="pt-10 border-t border-slate-100 space-y-6">
								<div className="flex justify-between items-center">
									<h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest italic">
										// Network Bindings
									</h4>
									{isEditing && (
										<button
											type="button"
											onClick={() =>
												setPuertosEdit([
													...puertosEdit,
													{
														puerto: 0,
														protocolo: "TCP",
														nombre: "",
														puertoVirtual: 0,
													},
												])
											}
											className="text-[8px] font-black bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-slate-900 transition-all uppercase"
										>
											+ New Mapping
										</button>
									)}
								</div>

								<div className="space-y-4">
									{(isEditing ? puertosEdit : servicio.lista_puertos).map(
										(p, i) => (
											<div
												key={i}
												className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-wrap justify-between items-center gap-4"
											>
												<div className="flex items-center gap-6">
													<div className="font-mono">
														<span className="text-[7px] block text-slate-400 uppercase font-black mb-1">
															Host
														</span>
														{isEditing ? (
															<input
																type="number"
																value={p.puerto}
																onChange={(e) => {
																	const n = [...puertosEdit];
																	n[i].puerto = parseInt(e.target.value) || 0;
																	setPuertosEdit(n);
																}}
																className="w-16 bg-white p-2 rounded-lg font-black text-xs border border-slate-200 outline-none focus:border-blue-500"
															/>
														) : (
															<span className="text-sm font-black text-slate-800">
																{p.puerto}
															</span>
														)}
													</div>
													<div className="text-blue-500 font-black">→</div>
													<div className="font-mono">
														<span className="text-[7px] block text-slate-400 uppercase font-black mb-1">
															Virtual
														</span>
														{isEditing ? (
															<input
																type="number"
																value={p.puertoVirtual}
																onChange={(e) => {
																	const n = [...puertosEdit];
																	n[i].puertoVirtual =
																		parseInt(e.target.value) || 0;
																	setPuertosEdit(n);
																}}
																className="w-16 bg-white p-2 rounded-lg font-black text-xs border border-slate-200 text-blue-600 outline-none focus:border-blue-500"
															/>
														) : (
															<span className="text-sm font-black text-blue-600">
																{p.puertoVirtual}
															</span>
														)}
													</div>
												</div>

												<div className="flex items-center gap-3">
													{isEditing ? (
														<div className="flex gap-2">
															<select
																value={p.protocolo}
																onChange={(e) => {
																	const n = [...puertosEdit];
																	n[i].protocolo = e.target.value;
																	setPuertosEdit(n);
																}}
																className="p-2 bg-white rounded-lg font-black text-[9px] border border-slate-200"
															>
																<option value="TCP">TCP</option>
																<option value="UDP">UDP</option>
															</select>
															<input
																type="text"
																value={p.nombre}
																onChange={(e) => {
																	const n = [...puertosEdit];
																	n[i].nombre = e.target.value;
																	setPuertosEdit(n);
																}}
																className="p-2 bg-white rounded-lg font-black text-[9px] border border-slate-200 w-24"
																placeholder="NOMBRE"
															/>
															<button
																type="button"
																onClick={() =>
																	setPuertosEdit(
																		puertosEdit.filter((_, idx) => idx !== i),
																	)
																}
																className="text-red-500 font-bold px-2"
															>
																×
															</button>
														</div>
													) : (
														<span className="text-[8px] font-black bg-white px-3 py-2 rounded-xl text-slate-400 border border-slate-100 uppercase">
															{p.nombre || "APP"} [{p.protocolo}]
														</span>
													)}
												</div>
											</div>
										),
									)}
								</div>
							</div>

							{isEditing && (
								<div className="flex gap-4 pt-10 border-t border-slate-100">
									<button
										type="submit"
										disabled={saving}
										className="flex-1 bg-blue-600 text-white py-6 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-900 transition-all shadow-2xl tracking-[0.2em]"
									>
										{saving ? "SINCRONIZANDO..." : "COMMIT CHANGES"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											fetchData();
										}}
										className="px-10 bg-slate-100 text-slate-400 py-6 rounded-2xl font-black text-[10px] uppercase"
									>
										Abort
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
