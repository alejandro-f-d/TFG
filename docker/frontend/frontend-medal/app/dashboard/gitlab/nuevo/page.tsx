"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface UsuarioBusqueda {
	idusuario: number;
	nombre: string;
	apellido1: string;
	apellido2: string;
	fotoperfil: string | null;
	uuidusuario: string;
	gitlab: string;
}

export default function NuevoProyectoGitLab() {
	const router = useRouter();

	// ESTADOS DEL PROYECTO
	const [nombre, setNombre] = useState("");
	const [descripcion, setDescripcion] = useState("");
	const [fechaInicio, setFechaInicio] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [fechaFin, setFechaFin] = useState("");

	// ESTADOS DEL EQUIPO (PANEL DERECHO)
	const [busqueda, setBusqueda] = useState("");
	const [usuariosSugeridos, setUsuariosSugeridos] = useState<UsuarioBusqueda[]>(
		[],
	);
	const [seleccionados, setSeleccionados] = useState<UsuarioBusqueda[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- UTILIDAD: CONVERSIÓN DE IMAGEN HEX A BASE64 ---
	const hexToImg = (hex: string | null) => {
		if (!hex || hex === "null") return null;
		try {
			const cleanHex = hex.startsWith("\\x") ? hex.slice(2) : hex;
			const matches = cleanHex.match(/.{1,2}/g);
			if (!matches) return null;
			const bytes = new Uint8Array(matches.map((b) => parseInt(b, 16)));
			let binary = "";
			for (let i = 0; i < bytes.length; i++)
				binary += String.fromCharCode(bytes[i]);
			return `data:image/jpeg;base64,${window.btoa(binary)}`;
		} catch {
			return null;
		}
	};

	// --- BÚSQUEDA DINÁMICA DE USUARIOS ---
	const buscarUsuarios = useCallback(async (val: string) => {
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);
			// Filtros solicitados: Activo y con GitLab
			url.searchParams.append("filtroNombre", val);
			url.searchParams.append("filtroStatus", "activo");
			url.searchParams.append("filtroGitlab", "true");
			url.searchParams.append("limit", "30"); // Límite amplio para el panel lateral

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (res.ok) setUsuariosSugeridos(data.info || []);
		} catch (error) {
			console.error("Error en búsqueda de usuarios:", error);
		}
	}, []);

	// Efecto de búsqueda con debounce manual al escribir
	useEffect(() => {
		const timer = setTimeout(() => buscarUsuarios(busqueda), 200);
		return () => clearTimeout(timer);
	}, [busqueda, buscarUsuarios]);

	// --- GESTIÓN DE SELECCIÓN ---
	const toggleUsuario = (u: UsuarioBusqueda) => {
		setSeleccionados((prev) =>
			prev.find((p) => p.idusuario === u.idusuario)
				? prev.filter((p) => p.idusuario !== u.idusuario)
				: [...prev, u],
		);
	};

	// --- ENVÍO DEL FORMULARIO ---
	// --- ENVÍO DEL FORMULARIO (CORREGIDO) ---
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validación básica: GitLab no acepta nombres vacíos o excesivamente cortos
		if (!nombre || nombre.trim().length < 3) {
			alert("El nombre del proyecto es demasiado corto.");
			return;
		}

		setIsSubmitting(true);
		try {
			const token = localStorage.getItem("token");

			const payload = {
				nombre: nombre.trim(),
				descripcion: descripcion.trim(),
				fechaInicio: fechaInicio,
				fechaFin: fechaFin || null,
				participantes: seleccionados.map((p) => p.idusuario),
				activo: true,
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/proyectosgitlab`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);

			const data = await res.json();

			if (res.ok) {
				router.push("/dashboard/gitlab");
			} else {
				// Si el backend devuelve un error (como el 400 de GitLab o el 500 de Postgres)
				alert(`Error: ${data.error || "No se pudo crear el proyecto"}`);
			}
		} catch (error) {
			console.error("Error en la petición:", error);
			alert("Error de conexión con el servidor.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 flex flex-col">
			{/* ESTILOS CSS PARA SCROLLBAR MINIMALISTA */}
			<style jsx global>{`
				.custom-scroll::-webkit-scrollbar { width: 4px; }
				.custom-scroll::-webkit-scrollbar-track { background: transparent; }
				.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
				.custom-scroll::-webkit-scrollbar-thumb:hover { background: #f97316; }
			`}</style>

			<div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
				{/* ==========================================
				    COLUMNA IZQUIERDA: CONFIGURACIÓN PROYECTO
				    ========================================== */}
				<div className="lg:col-span-7 flex flex-col space-y-8">
					<header>
						<button
							onClick={() => router.back()}
							className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-orange-500 transition-colors mb-6"
						>
							← REGRESAR AL DASHBOARD
						</button>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85]">
							NUEVO
							<br />
							<span className="text-orange-500">REPOSITORIO.</span>
						</h1>
					</header>

					<div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50 space-y-8 relative overflow-hidden">
						{/* Marca de agua */}
						<div className="absolute -top-6 -right-6 text-[100px] font-black italic text-slate-900 opacity-[0.02] select-none pointer-events-none">
							DATA
						</div>

						<div className="space-y-6 relative z-10">
							{/* Nombre */}
							<div>
								<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
									Nombre Identificador
								</label>
								<input
									required
									type="text"
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									placeholder="EJ: Medal Web Administration."
									className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-mono text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all uppercase"
								/>
							</div>

							{/* Fechas Grid */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
										Fecha Lanzamiento
									</label>
									<input
										type="date"
										value={fechaInicio}
										onChange={(e) => setFechaInicio(e.target.value)}
										className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-[11px] outline-none cursor-pointer"
									/>
								</div>
								<div>
									<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
										Fecha Finalización
									</label>
									<input
										type="date"
										value={fechaFin}
										onChange={(e) => setFechaFin(e.target.value)}
										className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-[11px] outline-none cursor-pointer"
									/>
								</div>
							</div>

							{/* Descripción */}
							<div>
								<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
									Documentación / Descripción
								</label>
								<textarea
									rows={5}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									placeholder="DETALLES TÉCNICOS DEL PROYECTO..."
									className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm outline-none resize-none"
								/>
							</div>
						</div>
					</div>

					<button
						onClick={handleSubmit}
						disabled={isSubmitting || !nombre}
						className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.4em] hover:bg-orange-600 transition-all shadow-2xl active:scale-[0.97] disabled:opacity-30 flex items-center justify-center gap-3"
					>
						{isSubmitting
							? "SINCRONIZANDO..."
							: "INICIALIZAR PROYECTO EN GITLAB"}
					</button>
				</div>

				{/* ==========================================
				    COLUMNA DERECHA: SELECCIÓN DE EQUIPO
				    ========================================== */}
				<div className="lg:col-span-5 flex flex-col h-[600px] lg:h-[calc(100vh-14rem)] sticky top-10">
					<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full overflow-hidden">
						{/* HEADER DEL PANEL */}
						<div className="p-8 border-b border-slate-50 bg-slate-50/30">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
									Configuración de Equipo
								</h2>
								<span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg shadow-orange-200">
									{seleccionados.length}
								</span>
							</div>
							<div className="relative">
								<input
									type="text"
									placeholder="BUSCAR USUARIOS ACTIVOS..."
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value)}
									className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-black text-[10px] uppercase tracking-widest outline-none focus:border-orange-500 transition-colors shadow-sm"
								/>
							</div>
						</div>

						{/* LISTA DE USUARIOS CON SCROLL INDEPENDIENTE */}
						<div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-3">
							{usuariosSugeridos.length > 0 ? (
								usuariosSugeridos.map((u) => {
									const isSelected = seleccionados.find(
										(p) => p.idusuario === u.idusuario,
									);
									return (
										<div
											key={u.idusuario}
											onClick={() => toggleUsuario(u)}
											className={`group flex items-center justify-between p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${
												isSelected
													? "bg-orange-500 text-white shadow-xl shadow-orange-100"
													: "bg-white hover:bg-slate-50 border border-transparent"
											}`}
										>
											<div className="flex items-center gap-4">
												<div
													className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${isSelected ? "border-white" : "border-slate-100"}`}
												>
													{u.fotoperfil ? (
														<img
															src={hexToImg(u.fotoperfil)!}
															className="w-full h-full object-cover"
														/>
													) : (
														<div
															className={`w-full h-full flex items-center justify-center text-[11px] font-black ${isSelected ? "bg-white text-orange-500" : "bg-slate-800 text-white"}`}
														>
															{u.nombre[0]}
															{u.apellido1[0]}
														</div>
													)}
												</div>
												<div className="truncate">
													<p
														className={`text-[11px] font-black uppercase truncate ${isSelected ? "text-white" : "text-slate-900"}`}
													>
														{u.nombre} {u.apellido1}
													</p>
													<p
														className={`text-[9px] font-mono ${isSelected ? "text-orange-100" : "text-orange-500"}`}
													>
														@{u.gitlab}
													</p>
												</div>
											</div>

											{/* Indicador Check */}
											<div
												className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
													isSelected
														? "bg-white border-white text-orange-500 scale-110"
														: "border-slate-100"
												}`}
											>
												{isSelected ? "✓" : ""}
											</div>
										</div>
									);
								})
							) : (
								<div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-10">
									<div className="text-4xl mb-4">🔍</div>
									<p className="text-[10px] font-black uppercase tracking-widest">
										No hay coincidencias en el laboratorio
									</p>
								</div>
							)}
						</div>

						{/* FOOTER DEL PANEL: AVATARES SELECCIONADOS */}
						{seleccionados.length > 0 && (
							<div className="p-8 bg-slate-900">
								<div className="flex items-center justify-between mb-4">
									<span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
										Equipo Actual
									</span>
								</div>
								<div className="flex -space-x-3 overflow-hidden">
									{seleccionados.slice(0, 10).map((s) => (
										<div
											key={s.idusuario}
											className="w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-[9px] text-white font-black overflow-hidden shrink-0 shadow-2xl"
										>
											{s.fotoperfil ? (
												<img
													src={hexToImg(s.fotoperfil)!}
													className="w-full h-full object-cover"
												/>
											) : (
												s.nombre[0]
											)}
										</div>
									))}
									{seleccionados.length > 10 && (
										<div className="w-10 h-10 rounded-full border-4 border-slate-900 bg-orange-600 flex items-center justify-center text-[9px] text-white font-black shrink-0">
											+{seleccionados.length - 10}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
