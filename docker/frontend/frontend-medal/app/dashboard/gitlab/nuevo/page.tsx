"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/backButton/BackButton";

// --- INTERFACES ---
interface UsuarioBusqueda {
	idusuario: number;
	nombre: string;
	apellido1: string;
	apellido2: string;
	fotoperfil: { type: string; data: number[] } | string | null;
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

	const formatAvatarUrl = (foto: any) => {
		if (!foto) return null;
		if (typeof foto === "string") {
			if (foto.startsWith("\\x")) {
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
		if (foto.type === "Buffer" && Array.isArray(foto.data)) {
			try {
				const uint8 = new Uint8Array(foto.data);
				let binary = "";
				for (let i = 0; i < uint8.length; i++)
					binary += String.fromCharCode(uint8[i]);
				return `data:image/png;base64,${window.btoa(binary)}`;
			} catch (err) {
				return null;
			}
		}
		return null;
	};

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

	const labelStyle =
		"text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 mb-3 block";
	const inputStyle =
		"w-full bg-white border-2 border-slate-950 rounded-2xl px-6 py-5 font-black text-sm text-slate-950 outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-600 transition-all uppercase placeholder:text-slate-300 shadow-sm";

	return (
		<div className="min-h-screen bg-[#F1F5F9] p-4 md:p-10 flex flex-col">
			<style jsx global>{`
				.custom-scroll::-webkit-scrollbar { width: 6px; }
				.custom-scroll::-webkit-scrollbar-track { background: transparent; }
				.custom-scroll::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; }
			`}</style>

			<div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
				{/* CONFIGURACIÓN PROYECTO */}
				<div className="lg:col-span-7 flex flex-col space-y-10">
					<header>
						<div className="mb-6">
							<BackButton />
						</div>
						<h1 className="text-8xl font-black text-slate-950 tracking-tighter uppercase leading-[0.8]">
							NUEVO
							<br />
							<span className="text-orange-600">REPOSITORIO.</span>
						</h1>
					</header>

					<div className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-slate-300 border-2 border-white space-y-10 relative overflow-hidden">
						<div className="absolute -top-10 -right-10 text-[140px] font-black italic text-slate-950 opacity-[0.04] select-none pointer-events-none">
							CORE
						</div>

						<div className="space-y-8 relative z-10">
							<div>
								<label className={labelStyle}>Nombre del Proyecto *</label>
								<input
									required
									type="text"
									value={nombre}
									onChange={(e) => setNombre(e.target.value)}
									placeholder="EJ: SISTEMA CONTROL DE ACTIVOS"
									className={inputStyle}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div>
									<label className={labelStyle}>Fecha Inicio</label>
									<input
										type="date"
										value={fechaInicio}
										onChange={(e) => setFechaInicio(e.target.value)}
										className={`${inputStyle} text-xs`}
									/>
								</div>
								<div>
									<label className={labelStyle}>Fecha Entrega</label>
									<input
										type="date"
										value={fechaFin}
										onChange={(e) => setFechaFin(e.target.value)}
										className={`${inputStyle} text-xs`}
									/>
								</div>
							</div>

							<div>
								<label className={labelStyle}>Resumen Ejecutivo / Notas</label>
								<textarea
									rows={4}
									value={descripcion}
									onChange={(e) => setDescripcion(e.target.value)}
									placeholder="DEFINA EL ALCANCE TÉCNICO..."
									className={`${inputStyle} normal-case h-40 resize-none`}
								/>
							</div>
						</div>
					</div>

					<button
						onClick={handleSubmit}
						disabled={isSubmitting || !nombre}
						className="w-full bg-slate-950 text-white py-10 rounded-[2.5rem] font-black text-base uppercase tracking-[0.5em] hover:bg-orange-600 transition-all shadow-2xl active:scale-[0.98] disabled:opacity-30 border-b-[10px] border-black"
					>
						{isSubmitting ? "CONFIGURANDO GITLAB..." : "DESPLEGAR PROYECTO"}
					</button>
				</div>

				{/* SELECCIÓN DE EQUIPO */}
				<div className="lg:col-span-5 flex flex-col h-[600px] lg:h-[calc(100vh-14rem)] sticky top-10">
					<div className="bg-white rounded-[4rem] shadow-2xl shadow-slate-300 border-2 border-slate-950 flex flex-col h-full overflow-hidden">
						<div className="p-10 border-b-4 border-slate-950 bg-slate-50">
							<div className="flex justify-between items-center mb-8">
								<h2 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-950 italic">
									Personal Autorizado
								</h2>
								<span className="bg-slate-950 text-white text-[10px] font-black px-4 py-2 rounded-xl">
									{seleccionados.length} SELECCIONADOS
								</span>
							</div>
							<div className="relative">
								<input
									type="text"
									placeholder="BUSCAR COLABORADOR..."
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value)}
									className="w-full bg-white border-[3px] border-slate-950 rounded-2xl px-6 py-5 font-black text-[12px] text-slate-950 uppercase tracking-[0.2em] outline-none focus:ring-8 focus:ring-orange-200/50 focus:border-orange-600 transition-all placeholder:text-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto custom-scroll p-8 space-y-4 bg-white">
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
											className={`group flex items-center justify-between p-5 rounded-[2rem] cursor-pointer transition-all border-2 ${
												isSelected
													? "bg-orange-600 border-orange-800 text-white shadow-lg scale-[1.02]"
													: "bg-slate-50 border-slate-200 hover:border-slate-950 text-slate-950 hover:bg-white"
											}`}
										>
											<div className="flex items-center gap-5">
												<div
													className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${isSelected ? "border-white" : "border-slate-950 shadow-md"}`}
												>
													{currentAvatar ? (
														<img
															src={currentAvatar}
															alt="Avatar"
															className="w-full h-full object-cover"
														/>
													) : (
														<div
															className={`w-full h-full flex items-center justify-center text-xs font-black ${isSelected ? "bg-white text-orange-600" : "bg-slate-950 text-white"}`}
														>
															{u.nombre[0]}
															{u.apellido1[0]}
														</div>
													)}
												</div>
												<div className="truncate">
													<p className="text-[12px] font-black uppercase truncate tracking-tight">
														{u.nombre} {u.apellido1}
													</p>
													<p
														className={`text-[10px] font-mono font-bold ${isSelected ? "text-orange-100" : "text-orange-600"}`}
													>
														@{u.gitlab}
													</p>
												</div>
											</div>
											<div
												className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all ${isSelected ? "bg-white border-white text-orange-600 rotate-12 scale-110" : "border-slate-300 bg-white"}`}
											>
												{isSelected ? "✓" : ""}
											</div>
										</div>
									);
								})
							) : (
								<div className="flex flex-col items-center justify-center h-full text-center py-20">
									<p className="text-[11px] font-black uppercase text-slate-300 tracking-[0.5em]">
										Esperando Búsqueda
									</p>
								</div>
							)}
						</div>

						{seleccionados.length > 0 && (
							<div className="p-10 bg-slate-950 border-t-4 border-orange-600">
								<div className="flex -space-x-4 overflow-hidden">
									{seleccionados.slice(0, 8).map((s) => {
										const favatar = formatAvatarUrl(s.fotoperfil);
										return (
											<div
												key={s.idusuario}
												className="w-12 h-12 rounded-full border-4 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] text-white font-black overflow-hidden shrink-0 shadow-2xl transition-transform hover:-translate-y-2"
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
									{seleccionados.length > 8 && (
										<div className="w-12 h-12 rounded-full border-4 border-slate-950 bg-orange-600 flex items-center justify-center text-[10px] text-white font-black shrink-0">
											+{seleccionados.length - 8}
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
