"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

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

	// Estados de carga y catálogos
	const [maquinas, setMaquinas] = useState<Maquina[]>([]);
	const [peticiones, setPeticiones] = useState<Peticion[]>([]);
	const [loading, setLoading] = useState(true);

	// Estado del Formulario
	const [formData, setFormData] = useState({
		nombreServicio: "",
		descripcionTecnica: "",
		entorno: "",
		publico: false,
		softwareBase: "",
		nivelSeveridad: "alto",
		idPeticion: 0,
		servidoresIds: [] as number[], // IDs numéricos para manejo interno y API
	});

	const [puertos, setPuertos] = useState<PuertoForm[]>([]);

	// --- GESTIÓN DE PERMISOS ---
	const permisos: string[] = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("permisos") || "[]");
		} catch {
			return [];
		}
	}, []);

	const esAdminTotal = permisos.includes("admin:total");

	// --- CARGA DE DATOS ---
	useEffect(() => {
		const fetchData = async () => {
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

				const resPet = await fetch(
					`${baseUrl}/api/peticion?status=APROBADA&limit=50`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const dataPet = await resPet.json();
				setPeticiones(dataPet.info?.rows || []);
			} catch (e) {
				console.error("Error de sincronización:", e);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// --- HANDLERS ---
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
				alert("Acceso denegado para uno de los nodos seleccionados.");
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

		// Lógica de Identificadores:
		// 1. El UUID de la primera máquina va en la URL.
		const idPrincipal = formData.servidoresIds[0];
		const uuidPrincipal = maquinas.find(
			(m) => m.idmaquina === idPrincipal,
		)?.uuidmaquina;

		// 2. Los IDs del RESTO de máquinas van en el array 'servidores' del body.
		const servidoresSecundariosIds = formData.servidoresIds.slice(1);

		const payload = {
			nombreServicio: formData.nombreServicio,
			descripcionTecnica: formData.descripcionTecnica,
			entorno: formData.entorno,
			publico: formData.publico,
			softwareBase: formData.softwareBase,
			activo: true,
			nivelSeveridad: formData.nivelSeveridad,
			idUsuario: userId ? parseInt(userId) : 1,
			idPeticion: formData.idPeticion,
			servidores: servidoresSecundariosIds, // IDs numéricos [3, 5, etc]
			puertosAbiertos: puertos,
		};

		try {
			const res = await fetch(
				`${baseUrl}/api/maquina/${uuidPrincipal}/servicios`,
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
				alert(err.error || "Error en el despliegue.");
			}
		} catch {
			alert("Error crítico de comunicación.");
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
					<button
						onClick={() => router.back()}
						className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block italic"
					>
						← Cancelar
					</button>
					<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
						Nuevo <span className="text-blue-600 italic">Servicio</span>
					</h1>
				</header>

				<form
					onSubmit={handleSubmit}
					className="grid grid-cols-1 lg:grid-cols-12 gap-10"
				>
					{/* LÓGICA TÉCNICA */}
					<div className="lg:col-span-7 space-y-8">
						<div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
							<div className="space-y-6">
								<div>
									<label className="text-[10px] font-black text-slate-400 uppercase ml-2 italic tracking-widest">
										Nombre
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
											Entorno (Texto Libre)
										</label>
										<input
											type="text"
											list="entornos-list"
											value={formData.entorno}
											onChange={(e) =>
												setFormData({ ...formData, entorno: e.target.value })
											}
											className="w-full bg-slate-50 border-none rounded-2xl p-5 mt-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 uppercase appearance-none-all"
										/>
										<datalist id="entornos-list">
											<option value="PROD" />
											<option value="STAGING" />
											<option value="DEV" />
										</datalist>
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
									placeholder="Descripción técnica..."
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

						{/* PUERTOS */}
						<div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white">
							<div className="flex justify-between items-center mb-8">
								<h2 className="text-xl font-black uppercase italic text-blue-400">
									Networking
								</h2>
								<button
									type="button"
									onClick={() =>
										setPuertos([
											...puertos,
											{
												numeroPuertoMaquina: 80,
												protocolo: "TCP",
												nombreServicio: "",
												puertoVirtual: 80,
											},
										])
									}
									className="bg-blue-600 text-[10px] px-6 py-3 rounded-xl font-black uppercase"
								>
									+ Add Port
								</button>
							</div>
							<div className="space-y-4">
								{puertos.map((p, i) => (
									<div
										key={i}
										className="flex gap-4 items-center bg-white/5 p-5 rounded-2xl"
									>
										<input
											type="number"
											value={p.numeroPuertoMaquina}
											onChange={(e) => {
												const n = [...puertos];
												n[i].numeroPuertoMaquina = parseInt(e.target.value);
												n[i].puertoVirtual = parseInt(e.target.value);
												setPuertos(n);
											}}
											className="w-24 bg-slate-800 border-none rounded-lg p-3 text-xs font-bold"
										/>
										<select
											value={p.protocolo}
											onChange={(e) => {
												const n = [...puertos];
												n[i].protocolo = e.target.value;
												setPuertos(n);
											}}
											className="bg-slate-800 border-none rounded-lg p-3 text-xs font-bold"
										>
											<option value="TCP">TCP</option>
											<option value="UDP">UDP</option>
										</select>
										<input
											type="text"
											placeholder="Alias"
											value={p.nombreServicio}
											onChange={(e) => {
												const n = [...puertos];
												n[i].nombreServicio = e.target.value;
												setPuertos(n);
											}}
											className="flex-1 bg-slate-800 border-none rounded-lg p-3 text-xs font-bold"
										/>
										<button
											type="button"
											onClick={() =>
												setPuertos(puertos.filter((_, idx) => idx !== i))
											}
											className="text-red-500 font-black"
										>
											✕
										</button>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* INFRAESTRUCTURA */}
					<div className="lg:col-span-5 space-y-8">
						<div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
							<label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
								Nodos (1º = Principal)
							</label>
							<select
								multiple
								required
								value={formData.servidoresIds.map(String)}
								onChange={handleMaquinaChange}
								className="w-full bg-slate-50 border-none rounded-[2rem] p-6 mt-4 font-bold text-slate-900 min-h-[300px] appearance-none"
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

							<div className="mt-8">
								<label className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">
									Petición
								</label>
								<select
									required
									value={formData.idPeticion}
									onChange={(e) =>
										setFormData({
											...formData,
											idPeticion: parseInt(e.target.value),
										})
									}
									className="w-full bg-slate-50 border-none rounded-2xl p-6 mt-2 font-bold text-slate-900"
								>
									<option value="">-- Seleccionar --</option>
									{peticiones.map((p) => (
										<option key={p.idpeticion} value={p.idpeticion}>
											{p.nombreproyectoasociado}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="bg-blue-600 rounded-[3rem] p-10 text-white">
							<input
								type="text"
								value={formData.softwareBase}
								onChange={(e) =>
									setFormData({ ...formData, softwareBase: e.target.value })
								}
								className="w-full bg-blue-700 border-none rounded-xl p-5 mb-4 font-bold placeholder:text-blue-300"
								placeholder="Software Base"
							/>
							<div className="flex items-center gap-4 bg-blue-800 p-6 rounded-2xl">
								<input
									type="checkbox"
									checked={formData.publico}
									onChange={(e) =>
										setFormData({ ...formData, publico: e.target.checked })
									}
									className="w-6 h-6 rounded-lg text-blue-500 border-none"
								/>
								<span className="text-[10px] font-black uppercase italic">
									Public Endpoint
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

			<style jsx global>{`
        .appearance-none-all::-webkit-calendar-picker-indicator { display: none !important; }
        .appearance-none-all { -webkit-appearance: none; appearance: none; }
        select::-webkit-scrollbar { width: 4px; }
        select::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        select option { margin-bottom: 5px; padding: 12px; border-radius: 12px; font-size: 11px; }
      `}</style>
		</div>
	);
}
