"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface Maquina {
	idmaquina: number;
	nombre: string;
}
interface Momento {
	idmomentoejecucion: number;
	nombre: string;
}
interface Prioridad {
	idprioridad: number;
	nombre: string;
}

export default function NuevaPeticionPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	// Catálogos
	const [servidores, setServidores] = useState<Maquina[]>([]);
	const [momentos, setMomentos] = useState<Momento[]>([]);
	const [prioridades, setPrioridades] = useState<Prioridad[]>([]);
	const [searchServer, setSearchServer] = useState("");

	// --- FORM DATA SEGÚN JOI SCHEMA ---
	const [formData, setFormData] = useState({
		nombreProyectoAsociado: "",
		servidorAsociado: [] as number[],
		necesidadServidor: "",
		tareasServidor: "",
		cpuSolicitada: "",
		gpuSolicitada: "No GPU",
		ram: "",
		disco: "",
		prioridadTarea: 0,
		momentoEjecucion: 0,
		docker: "",
		sistemaOperativo: "Ubuntu 22.04", // Valor por defecto
		tiempoEstimadoTarea: "",
		nombreServicioAsociado: "",
		nombreAccesoNativo: "",
		justificacionAccesoNativo: "",
		comentariosAdicionales: "",
		fechaFin: "",
	});

	const filteredServidores = useMemo(() => {
		return servidores.filter((s) =>
			s.nombre.toLowerCase().includes(searchServer.toLowerCase()),
		);
	}, [servidores, searchServer]);

	useEffect(() => {
		const fetchData = async () => {
			const token = localStorage.getItem("token");
			if (!token) return logout();
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			try {
				const resMaq = await fetch(
					`${baseUrl}/api/maquina?soloServidores=true&limit=100`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const dataMaq = await resMaq.json();
				setServidores(Array.isArray(dataMaq) ? dataMaq : dataMaq.info || []);

				const resExec = await fetch(
					`${baseUrl}/api/peticion/momentoEjecucion`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const dataExec = await resExec.json();
				if (dataExec) {
					setMomentos(dataExec.momentos || []);
					setPrioridades(dataExec.prioridades || []);
				}
			} catch (e) {
				console.error("Error catálogos:", e);
			}
		};
		fetchData();
	}, []);

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const toggleSelection = (
		field: "prioridadTarea" | "momentoEjecucion",
		id: number,
	) => {
		setFormData((prev) => ({ ...prev, [field]: id }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		// Saneamiento para cumplir con Joi y Postgres
		const cleanData = {
			...formData,
			fechaFin: formData.fechaFin === "" ? null : formData.fechaFin,
			nombreServicioAsociado: formData.nombreServicioAsociado || null,
			nombreAccesoNativo: formData.nombreAccesoNativo || null,
			justificacionAccesoNativo: formData.justificacionAccesoNativo || null,
			comentariosAdicionales: formData.comentariosAdicionales || null,
			prioridadTarea: Number(formData.prioridadTarea),
			momentoEjecucion: Number(formData.momentoEjecucion),
		};

		try {
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			const res = await fetch(`${baseUrl}/api/peticion`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(cleanData),
			});
			if (res.ok) router.push("/dashboard/peticiones");
			else {
				const err = await res.json();
				alert(`Error: ${err.error || "Fallo en validación"}`);
			}
		} catch (e) {
			alert("Error de red");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-8 font-sans">
			<form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-12">
				{/* HEADER */}
				<div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
					<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase">
						NUEVA <span className="text-blue-600">PETICIÓN</span>
					</h1>
					<button
						type="button"
						onClick={() => router.back()}
						className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-600 transition-all"
					>
						[ DESCARTAR ]
					</button>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
					{/* COLUMNA IZQUIERDA: INFRAESTRUCTURA Y PROYECTO */}
					<div className="lg:col-span-7 space-y-10">
						{/* 01. SERVIDORES */}
						<section className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
							<div className="flex justify-between items-center mb-8">
								<h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
									01. Selección de Nodos
								</h3>
								<input
									type="text"
									placeholder="BUSCAR..."
									value={searchServer}
									onChange={(e) => setSearchServer(e.target.value)}
									className="bg-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500 w-48"
								/>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scroll pr-2">
								{filteredServidores.map((srv) => (
									<button
										key={srv.idmaquina}
										type="button"
										onClick={() =>
											setFormData((p) => ({
												...p,
												servidorAsociado: p.servidorAsociado.includes(
													srv.idmaquina,
												)
													? p.servidorAsociado.filter(
															(id) => id !== srv.idmaquina,
														)
													: [...p.servidorAsociado, srv.idmaquina],
											}))
										}
										className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${formData.servidorAsociado.includes(srv.idmaquina) ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200"}`}
									>
										{srv.nombre}
									</button>
								))}
							</div>
						</section>

						{/* 02. PROYECTO & ACCESO NATIVO */}
						<section className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
							<h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
								02. Identificación & Acceso
							</h3>
							<input
								required
								name="nombreProyectoAsociado"
								value={formData.nombreProyectoAsociado}
								onChange={handleInputChange}
								placeholder="NOMBRE DEL PROYECTO *"
								className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<div className="grid grid-cols-2 gap-4">
								<input
									name="nombreServicioAsociado"
									value={formData.nombreServicioAsociado}
									onChange={handleInputChange}
									placeholder="SERVICIO ASOCIADO *"
									className="bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none"
								/>
								<input
									name="nombreAccesoNativo"
									value={formData.nombreAccesoNativo}
									onChange={handleInputChange}
									placeholder="NOMBRE ACCESO NATIVO"
									className="bg-slate-50 rounded-2xl p-5 text-sm font-bold outline-none"
								/>
							</div>
							<textarea
								name="justificacionAccesoNativo"
								value={formData.justificacionAccesoNativo}
								onChange={handleInputChange}
								placeholder="JUSTIFICACIÓN ACCESO NATIVO (SI APLICA)"
								className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-medium min-h-[80px] outline-none"
							/>
						</section>

						{/* 03. MEMORIA TÉCNICA */}
						<section className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
							<h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
								03. Memoria Técnica
							</h3>
							<textarea
								required
								name="necesidadServidor"
								value={formData.necesidadServidor}
								onChange={handleInputChange}
								placeholder="NECESIDAD DEL SERVIDOR *"
								className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-medium min-h-[100px] outline-none"
							/>
							<textarea
								required
								name="tareasServidor"
								value={formData.tareasServidor}
								onChange={handleInputChange}
								placeholder="TAREAS A REALIZAR *"
								className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-medium min-h-[100px] outline-none"
							/>
							<textarea
								name="comentariosAdicionales"
								value={formData.comentariosAdicionales}
								onChange={handleInputChange}
								placeholder="COMENTARIOS ADICIONALES"
								className="w-full bg-slate-50 rounded-2xl p-5 text-sm font-medium min-h-[80px] outline-none"
							/>
						</section>
					</div>

					{/* COLUMNA DERECHA: RECURSOS Y SCHEDULING */}
					<div className="lg:col-span-5 space-y-10">
						{/* 04. RECURSOS (JOI REQUERIDOS) */}
						<section className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white">
							<h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-8">
								CONFIGURACIÓN DE HARDWARE
							</h3>
							<div className="grid grid-cols-2 gap-8">
								{["cpuSolicitada", "ram", "disco", "tiempoEstimadoTarea"].map(
									(f) => (
										<div key={f} className="border-b border-white/10 pb-2">
											<label className="text-[8px] font-black text-slate-500 uppercase">
												{f.replace(/([A-Z])/g, " $1")}
											</label>
											<input
												required
												name={f}
												value={(formData as any)[f]}
												onChange={handleInputChange}
												placeholder="---"
												className="w-full bg-transparent text-xl font-black outline-none mt-1"
											/>
										</div>
									),
								)}
								<div className="border-b border-white/10 pb-2">
									<label className="text-[8px] font-black text-slate-500 uppercase">
										GPU TIPO
									</label>
									<input
										name="gpuSolicitada"
										value={formData.gpuSolicitada}
										onChange={handleInputChange}
										className="w-full bg-transparent text-xl font-black outline-none mt-1"
									/>
								</div>
								<div className="border-b border-white/10 pb-2">
									<label className="text-[8px] font-black text-slate-500 uppercase">
										FECHA FIN
									</label>
									<input
										type="date"
										name="fechaFin"
										value={formData.fechaFin}
										onChange={handleInputChange}
										className="w-full bg-transparent text-sm font-black outline-none mt-2 uppercase"
									/>
								</div>
							</div>
						</section>

						{/* 05. ENTORNO & SCHEDULING */}
						<section className="bg-white p-10 rounded-[3.5rem] shadow-2xl space-y-8">
							<div className="space-y-4">
								<h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
									Software & OS
								</h3>
								<input
									required
									name="sistemaOperativo"
									value={formData.sistemaOperativo}
									onChange={handleInputChange}
									placeholder="SISTEMA OPERATIVO *"
									className="w-full bg-slate-50 rounded-xl p-4 text-xs font-bold outline-none"
								/>
								<input
									required
									name="docker"
									value={formData.docker}
									onChange={handleInputChange}
									placeholder="IMAGEN DOCKER *"
									className="w-full bg-slate-50 rounded-xl p-4 text-xs font-mono font-bold outline-none"
								/>
							</div>

							<div className="space-y-4">
								<h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
									Prioridad
								</h3>
								<div className="grid grid-cols-2 gap-2">
									{prioridades.map((p) => (
										<button
											key={p.idprioridad}
											type="button"
											onClick={() =>
												toggleSelection("prioridadTarea", p.idprioridad)
											}
											className={`p-4 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${formData.prioridadTarea === p.idprioridad ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}
										>
											{p.nombre}
										</button>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
									Momento de Ejecución
								</h3>
								<div className="space-y-2">
									{momentos.map((m) => (
										<button
											key={m.idmomentoejecucion}
											type="button"
											onClick={() =>
												toggleSelection(
													"momentoEjecucion",
													m.idmomentoejecucion,
												)
											}
											className={`w-full p-4 rounded-xl text-[9px] font-black uppercase border-2 text-left flex justify-between items-center ${formData.momentoEjecucion === m.idmomentoejecucion ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-transparent text-slate-400"}`}
										>
											{m.nombre}{" "}
											{formData.momentoEjecucion === m.idmomentoejecucion &&
												"●"}
										</button>
									))}
								</div>
							</div>

							<button
								disabled={loading}
								className="w-full bg-blue-600 hover:bg-slate-900 text-white p-8 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all disabled:opacity-30"
							>
								{loading ? "ENVIANDO..." : "CONFIRMAR PETICIÓN"}
							</button>
						</section>
					</div>
				</div>
			</form>
			<style
				jsx
				global
			>{`.custom-scroll::-webkit-scrollbar { width: 4px; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
		</div>
	);
}
