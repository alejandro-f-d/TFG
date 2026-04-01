"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// --- INTERFACES ---
interface UsuarioBusqueda {
	idusuario: number;
	nombre: string;
	apellido1: string;
	apellido2: string;
	fotoperfil: { type: string; data: number[] } | string | null; // Tipado actualizado
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

	// ESTADOS DEL EQUIPO
	const [busqueda, setBusqueda] = useState("");
	const [usuariosSugeridos, setUsuariosSugeridos] = useState<UsuarioBusqueda[]>(
		[],
	);
	const [seleccionados, setSeleccionados] = useState<UsuarioBusqueda[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- UTILIDAD: CONVERSIÓN DE IMAGEN (Lógica idéntica a tu Header) ---
	const formatAvatarUrl = (foto: any) => {
		if (!foto) return null;

		// Caso: string directo (URL o base64)
		if (typeof foto === "string") {
			if (foto.startsWith("\\x")) {
				// Si por casualidad viene como hex string de Postgres
				try {
					const cleanHex = foto.slice(2);
					const bytes = new Uint8Array(
						cleanHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
					);
					let binary = "";
					for (let i = 0; i < bytes.length; i++)
						binary += String.fromCharCode(bytes[i]);
					return `data:image/png;base64,${window.btoa(binary)}`;
				} catch {
					return null;
				}
			}
			return foto;
		}

		// Caso: Objeto Buffer { type: 'Buffer', data: [] }
		if (foto.type === "Buffer" && Array.isArray(foto.data)) {
			try {
				const uint8 = new Uint8Array(foto.data);
				let binary = "";
				for (let i = 0; i < uint8.length; i++) {
					binary += String.fromCharCode(uint8[i]);
				}
				const base64 = window.btoa(binary);
				return `data:image/png;base64,${base64}`;
			} catch (err) {
				console.error("Error al convertir imagen de usuario:", err);
				return null;
			}
		}

		return null;
	};

	// --- BÚSQUEDA DINÁMICA ---
	const buscarUsuarios = useCallback(async (val: string) => {
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);
			url.searchParams.append("filtroNombre", val);
			url.searchParams.append("filtroStatus", "activo");
			url.searchParams.append("filtroGitlab", "true");
			url.searchParams.append("limit", "30");

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (res.ok) setUsuariosSugeridos(data.info || []);
		} catch (error) {
			console.error("Error en búsqueda:", error);
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => buscarUsuarios(busqueda), 200);
		return () => clearTimeout(timer);
	}, [busqueda, buscarUsuarios]);

	const toggleUsuario = (u: UsuarioBusqueda) => {
		setSeleccionados((prev) =>
			prev.find((p) => p.idusuario === u.idusuario)
				? prev.filter((p) => p.idusuario !== u.idusuario)
				: [...prev, u],
		);
	};

	// --- ENVÍO DEL FORMULARIO ---
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
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
			if (res.ok) router.push("/dashboard/gitlab");
			else alert(`Error: ${data.error || "No se pudo crear el proyecto"}`);
		} catch (error) {
			alert("Error de conexión con el servidor.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 flex flex-col">
			<style jsx global>{`
				.custom-scroll::-webkit-scrollbar { width: 4px; }
				.custom-scroll::-webkit-scrollbar-track { background: transparent; }
				.custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
				.custom-scroll::-webkit-scrollbar-thumb:hover { background: #f97316; }
			`}</style>

			<div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
				{/* CONFIGURACIÓN PROYECTO */}
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
						<div className="absolute -top-6 -right-6 text-[100px] font-black italic text-slate-900 opacity-[0.02] select-none pointer-events-none">
							DATA
						</div>
						<div className="space-y-6 relative z-10">
							<div>
								<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
									Nombre Identificador
								</label>
								<input
									required
									type="text"
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									placeholder="EJ: MEDAL WEB SERVER."
									className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-mono text-sm outline-none focus:ring-4 focus:ring-orange-100 transition-all uppercase"
								/>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
										Fecha Lanzamiento
									</label>
									<input
										type="date"
										value={fechaInicio}
										onChange={(e) => setFechaInicio(e.target.value)}
										className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-[11px] outline-none"
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
										className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-[11px] outline-none"
									/>
								</div>
							</div>
							<div>
								<label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
									Documentación / Descripción
								</label>
								<textarea
									rows={5}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									placeholder="DETALLES TÉCNICOS..."
									className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm outline-none resize-none"
								/>
							</div>
						</div>
					</div>

					<button
						onClick={handleSubmit}
						disabled={isSubmitting || !nombre}
						className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.4em] hover:bg-orange-600 transition-all shadow-2xl active:scale-[0.97] disabled:opacity-30"
					>
						{isSubmitting
							? "SINCRONIZANDO..."
							: "INICIALIZAR PROYECTO EN GITLAB"}
					</button>
				</div>

				{/* SELECCIÓN DE EQUIPO */}
				<div className="lg:col-span-5 flex flex-col h-[600px] lg:h-[calc(100vh-14rem)] sticky top-10">
					<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full overflow-hidden">
						<div className="p-8 border-b border-slate-50 bg-slate-50/30">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
									Equipo
								</h2>
								<span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-md">
									{seleccionados.length}
								</span>
							</div>
							<input
								type="text"
								placeholder="BUSCAR..."
								value={busqueda}
								onChange={(e) => setBusqueda(e.target.value)}
								className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-black text-[10px] uppercase outline-none focus:border-orange-500 transition-colors"
							/>
						</div>

						<div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-3">
							{usuariosSugeridos.length > 0 ? (
								usuariosSugeridos.map((u) => {
									const isSelected = seleccionados.find(
										(p) => p.idusuario === u.idusuario,
									);
									const currentAvatar = formatAvatarUrl(u.fotoperfil);
									return (
										<div
											key={u.idusuario}
											onClick={() => toggleUsuario(u)}
											className={`group flex items-center justify-between p-4 rounded-[1.5rem] cursor-pointer transition-all ${isSelected ? "bg-orange-500 text-white" : "bg-white hover:bg-slate-50 border border-transparent"}`}
										>
											<div className="flex items-center gap-4">
												<div
													className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${isSelected ? "border-white" : "border-slate-100"}`}
												>
													{currentAvatar ? (
														<img
															src={currentAvatar}
															alt="Avatar"
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
													<p className="text-[11px] font-black uppercase truncate">
														{u.nombre} {u.apellido1}
													</p>
													<p
														className={`text-[9px] font-mono ${isSelected ? "text-orange-100" : "text-orange-500"}`}
													>
														@{u.gitlab}
													</p>
												</div>
											</div>
											<div
												className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? "bg-white border-white text-orange-500" : "border-slate-100"}`}
											>
												{isSelected && "✓"}
											</div>
										</div>
									);
								})
							) : (
								<div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
									<p className="text-[10px] font-black uppercase">
										Sin resultados
									</p>
								</div>
							)}
						</div>

						{seleccionados.length > 0 && (
							<div className="p-8 bg-slate-900">
								<div className="flex -space-x-3 overflow-hidden">
									{seleccionados.slice(0, 10).map((s) => {
										const favatar = formatAvatarUrl(s.fotoperfil);
										return (
											<div
												key={s.idusuario}
												className="w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-[9px] text-white font-black overflow-hidden shrink-0 shadow-2xl"
											>
												{favatar ? (
													<img
														src={favatar}
														className="w-full h-full object-cover"
													/>
												) : (
													s.nombre[0]
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
