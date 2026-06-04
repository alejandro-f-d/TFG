"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/backButton/BackButton";

// --- INTERFACES ---
interface Maquina {
	idmaquina: number;
	nombre: string;
	uuidmaquina: string;
	direccionipprivadav4: string;
	esservidor: boolean;
}

interface Peticion {
	idpeticion: number;
	uuidpeticion: string;
	nombreproyectoasociado: string;
}

interface PuertoForm {
	numeroPuertoMaquina: number;
	protocolo: string;
	nombreServicio: string;
	puertoVirtual: number;
}

export default function CrearServicioPage() {
	const router = useRouter();

	const [maquinas, setMaquinas] = useState<Maquina[]>([]);
	const [peticiones, setPeticiones] = useState<Peticion[]>([]);
	const [loading, setLoading] = useState(true);

	const [busquedaPeticion, setBusquedaPeticion] = useState("");
	const [buscandoPeticiones, setBuscandoPeticiones] = useState(false);

	const [formData, setFormData] = useState({
		nombreServicio: "",
		descripcionTecnica: "",
		entorno: "En producción",
		publico: false,
		softwareBase: "",
		nivelSeveridad: "alto",
		idPeticion: 0,
		servidoresIds: [] as number[],
	});

	const [puertos, setPuertos] = useState<PuertoForm[]>([]);

	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("permisos") || "[]");
		} catch {
			return [];
		}
	}, []);

	const esAdminTotal = permisos.includes("admin:total");

	// FETCH INICIAL DE MÁQUINAS
	useEffect(() => {
		const fetchMaquinas = async () => {
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			try {
				const resMaq = await fetch(
					`${baseUrl}/api/maquina?soloServidores=true`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const dataMaq = await resMaq.json();
				setMaquinas(Array.isArray(dataMaq) ? dataMaq : []);
			} catch (e) {
				console.error("Error cargando máquinas:", e);
			} finally {
				setLoading(false);
			}
		};
		fetchMaquinas();
	}, []);

	// FETCH DE PETICIONES
	useEffect(() => {
		const fetchPeticiones = async () => {
			setBuscandoPeticiones(true);
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

			try {
				const query = new URLSearchParams({
					status: "APROBADA",
					limit: "50",
					filtroNombre: busquedaPeticion,
				});

				const resPet = await fetch(
					`${baseUrl}/api/peticion?${query.toString()}`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const dataPet = await resPet.json();
				setPeticiones(dataPet.info?.rows || []);
			} catch (e) {
				console.error("Error buscando peticiones:", e);
			} finally {
				setBuscandoPeticiones(false);
			}
		};

		const timeoutId = setTimeout(fetchPeticiones, 300);
		return () => clearTimeout(timeoutId);
	}, [busquedaPeticion]);

	const handleMaquinaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedIds = Array.from(e.target.selectedOptions, (opt) =>
			parseInt(opt.value),
		);

		if (!esAdminTotal) {
			const maquinasSinPermiso = selectedIds.filter((id) => {
				const m = maquinas.find((maq) => maq.idmaquina === id);
				return !permisos.includes(`maquina:crearServicios:${m?.uuidmaquina}`);
			});
			if (maquinasSinPermiso.length > 0) {
				alert(
					"No tienes permisos de creación en uno de los nodos seleccionados.",
				);
				return;
			}
		}
		setFormData({ ...formData, servidoresIds: selectedIds });
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const token = localStorage.getItem("token");
		const userId = localStorage.getItem("idUsuario");
		const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

		if (formData.servidoresIds.length === 0) {
			alert("Seleccione al menos un nodo de infraestructura.");
			return;
		}

		if (formData.idPeticion === 0) {
			alert("Debe vincular una petición aprobada.");
			return;
		}

		const idPrincipal = formData.servidoresIds[0];
		const maqPrincipal = maquinas.find((m) => m.idmaquina === idPrincipal);
		if (!maqPrincipal) return;

		const servidoresSecundariosIds = formData.servidoresIds.slice(1);

		const payload = {
			nombreServicio: formData.nombreServicio,
			descripcionTecnica: formData.descripcionTecnica,
			entorno: formData.entorno,
			publico: formData.publico,
			softwareBase: formData.softwareBase,
			nivelSeveridad: formData.nivelSeveridad,
			idPeticion: Number(formData.idPeticion),
			idUsuario: userId ? parseInt(userId) : 1,
			servidores: servidoresSecundariosIds,
			puertosAbiertos: puertos.map((p) => ({
				numeroPuertoMaquina: Number(p.numeroPuertoMaquina),
				protocolo: p.protocolo,
				nombreServicio: p.nombreServicio,
				puertoVirtual: Number(p.puertoVirtual),
			})),
			activo: true,
		};

		try {
			const res = await fetch(
				`${baseUrl}/api/maquina/${maqPrincipal.uuidmaquina}/servicios`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);

			if (res.ok) {
				router.push("/dashboard/servicios");
			} else {
				const err = await res.json();
				alert(err.message || err.error || "Error en el despliegue.");
			}
		} catch {
			alert("Error crítico de comunicación con el servidor.");
		}
	};

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
				<p className="font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse">
					Sincronizando Cluster...
				</p>
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-16 px-8 font-sans">
			<div className="max-w-7xl mx-auto">
				<header className="mb-12">
					<div className="mb-6">
						<BackButton />
					</div>
					<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
						Nuevo <span className="text-blue-600 italic">Servicio</span>
					</h1>
				</header>

				<form
					onSubmit={handleSubmit}
					className="grid grid-cols-1 lg:grid-cols-12 gap-10"
				>
					<div className="lg:col-span-7 space-y-8">
						<div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
							<div className="space-y-6">
								<div>
									<label className="text-[10px] font-black text-slate-400 uppercase ml-2 italic tracking-widest">
										Nombre del Servicio
									</label>
									<input
										type="text"
										required
										value={formData.nombreServicio}
										onChange={(e) =>
											setFormData({
												...formData,
												nombreServicio: e.target.value,
											})
										}
										className="w-full bg-slate-50 border-none rounded-2xl p-6 mt-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 text-2xl uppercase"
									/>
								</div>
								<div className="grid grid-cols-2 gap-6">
									<div className="space-y-2">
										<label className="text-[10px] font-black text-slate-400 uppercase ml-2 italic">
											Entorno
										</label>
										{/* DESPLEGABLE DE ENTORNO ACTUALIZADO */}
										<select
											required
											value={formData.entorno}
											onChange={(e) =>
												setFormData({ ...formData, entorno: e.target.value })
											}
											className="w-full bg-slate-50 border-none rounded-2xl p-5 mt-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 uppercase appearance-none"
										>
											<option value="Activo">Activo</option>
											<option value="Desactivado">Desactivado</option>
											<option value="Eliminado">Eliminado</option>
											<option value="En producción">En producción</option>
											<option value="Error">Error</option>
										</select>
									</div>
									<div className="space-y-2">
										<label className="text-[10px] font-black text-slate-400 uppercase ml-2 italic">
											Severidad
										</label>
										<select
											value={formData.nivelSeveridad}
											onChange={(e) =>
												setFormData({
													...formData,
													nivelSeveridad: e.target.value,
												})
											}
											className="w-full bg-slate-50 border-none rounded-2xl p-5 mt-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 uppercase"
										>
											<option value="bajo">Bajo</option>
											<option value="medio">Medio</option>
											<option value="alto">Alto</option>
											<option value="critico">Crítico</option>
										</select>
									</div>
								</div>
								<textarea
									placeholder="Descripción técnica y objetivos del servicio..."
									value={formData.descripcionTecnica}
									onChange={(e) =>
										setFormData({
											...formData,
											descripcionTecnica: e.target.value,
										})
									}
									className="w-full bg-slate-50 border-none rounded-2xl p-6 mt-2 font-medium text-slate-700 h-32 resize-none focus:ring-2 focus:ring-blue-600"
								/>
							</div>
						</div>

						{/* NETWORK BINDING */}
						<div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white">
							<div className="flex justify-between items-center mb-8">
								<div>
									<h2 className="text-xl font-black uppercase italic text-blue-400">
										Network Binding
									</h2>
									<p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
										Host Port → Virtual Port Mappings
									</p>
								</div>
								<button
									type="button"
									onClick={() =>
										setPuertos([
											...puertos,
											{
												numeroPuertoMaquina: 80,
												protocolo: "TCP",
												nombreServicio: "",
												puertoVirtual: 8080,
											},
										])
									}
									className="bg-blue-600 hover:bg-white hover:text-blue-600 transition-all text-[10px] px-6 py-3 rounded-xl font-black uppercase"
								>
									+ Add Binding
								</button>
							</div>

							<div className="space-y-4">
								{puertos.map((p, i) => (
									<div
										key={i}
										className="bg-white/5 border border-white/10 p-6 rounded-[2rem]"
									>
										<div className="grid grid-cols-12 gap-4 items-end">
											<div className="col-span-3">
												<label className="text-[7px] font-black text-blue-400 uppercase block mb-2 tracking-widest text-center">
													Puerto Host
												</label>
												<input
													type="number"
													value={p.numeroPuertoMaquina}
													onChange={(e) => {
														const n = [...puertos];
														n[i].numeroPuertoMaquina =
															parseInt(e.target.value) || 0;
														setPuertos(n);
													}}
													className="w-full bg-slate-800 border-none rounded-xl p-4 text-center text-sm font-black"
												/>
											</div>
											<div className="col-span-1 flex items-center justify-center pb-4">
												<span className="text-blue-600 font-black">→</span>
											</div>
											<div className="col-span-3">
												<label className="text-[7px] font-black text-emerald-400 uppercase block mb-2 tracking-widest text-center">
													Puerto Virtual
												</label>
												<input
													type="number"
													value={p.puertoVirtual}
													onChange={(e) => {
														const n = [...puertos];
														n[i].puertoVirtual = parseInt(e.target.value) || 0;
														setPuertos(n);
													}}
													className="w-full bg-slate-800 border-none rounded-xl p-4 text-center text-sm font-black text-emerald-400"
												/>
											</div>
											<div className="col-span-4">
												<label className="text-[7px] font-black text-slate-500 uppercase block mb-2 tracking-widest">
													Protocolo & Alias
												</label>
												<div className="flex gap-2">
													<select
														value={p.protocolo}
														onChange={(e) => {
															const n = [...puertos];
															n[i].protocolo = e.target.value;
															setPuertos(n);
														}}
														className="bg-slate-800 border-none rounded-xl p-4 text-[9px] font-black uppercase"
													>
														<option value="TCP">TCP</option>
														<option value="UDP">UDP</option>
													</select>
													<input
														type="text"
														placeholder="HTTP..."
														value={p.nombreServicio}
														onChange={(e) => {
															const n = [...puertos];
															n[i].nombreServicio = e.target.value;
															setPuertos(n);
														}}
														className="flex-1 bg-slate-800 border-none rounded-xl p-4 text-[10px] font-bold"
													/>
												</div>
											</div>
											<button
												type="button"
												onClick={() =>
													setPuertos(puertos.filter((_, idx) => idx !== i))
												}
												className="col-span-1 h-12 flex items-center justify-center text-red-500 hover:text-red-400 text-xl"
											>
												✕
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="lg:col-span-5 space-y-8">
						<div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
							<label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
								Infraestructura de Destino
							</label>
							<select
								multiple
								required
								value={formData.servidoresIds.map(String)}
								onChange={handleMaquinaChange}
								className="w-full bg-slate-50 border-none rounded-[2rem] p-6 mt-4 font-bold text-slate-900 min-h-[200px] appearance-none scrollbar-hide"
							>
								{maquinas.map((m) => (
									<option
										key={m.idmaquina}
										value={m.idmaquina}
										className="p-4 rounded-xl mb-1 checked:bg-slate-900 checked:text-white"
									>
										{m.nombre.toUpperCase()} — {m.direccionipprivadav4}
									</option>
								))}
							</select>

							<div className="mt-12 space-y-4">
								<label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
									Vincular Proyecto/Petición
								</label>
								<div className="relative">
									<input
										type="text"
										placeholder="Filtrar peticiones..."
										value={busquedaPeticion}
										onChange={(e) => setBusquedaPeticion(e.target.value)}
										className="w-full bg-slate-100 border-none rounded-xl p-4 text-xs font-bold text-slate-700"
									/>
									{buscandoPeticiones && (
										<div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									)}
								</div>
								<select
									required
									value={formData.idPeticion}
									onChange={(e) =>
										setFormData({
											...formData,
											idPeticion: parseInt(e.target.value),
										})
									}
									className="w-full bg-slate-50 border-none rounded-2xl p-6 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
								>
									<option value="0">-- Seleccionar Petición --</option>
									{peticiones.map((p) => (
										<option key={p.idpeticion} value={p.idpeticion}>
											{p.nombreproyectoasociado.toUpperCase()}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-xl shadow-blue-100">
							<label className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2 block">
								Stack Tecnológico
							</label>
							<input
								type="text"
								value={formData.softwareBase}
								onChange={(e) =>
									setFormData({ ...formData, softwareBase: e.target.value })
								}
								className="w-full bg-blue-700 border-none rounded-xl p-5 mb-4 font-bold placeholder:text-blue-300 outline-none"
								placeholder="e.g. Docker / Nginx / Node.js"
							/>
							<div className="flex items-center gap-4 bg-blue-800 p-6 rounded-2xl">
								<input
									type="checkbox"
									checked={formData.publico}
									onChange={(e) =>
										setFormData({ ...formData, publico: e.target.checked })
									}
									className="w-6 h-6 rounded-lg text-blue-500 border-none cursor-pointer"
								/>
								<span className="text-[10px] font-black uppercase italic">
									Public Endpoint Access
								</span>
							</div>
						</div>

						<button
							type="submit"
							className="w-full bg-slate-900 text-white p-10 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] hover:bg-blue-600 transition-all shadow-2xl active:scale-95"
						>
							Launch Deployment
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
