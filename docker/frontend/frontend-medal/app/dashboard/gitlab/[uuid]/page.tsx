"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import {
	AreaChart,
	Area,
	XAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

// --- INTERFACES ---
interface Participante {
	idusuario: number;
	nombre: string;
	apellido1: string;
	gitlab: string;
	fotoperfil: any;
}

interface ProyectoDetalle {
	info: {
		idproyecto: number;
		nombre: string;
		descripcion: string;
		uuidproyecto: string;
		fechainicio: string;
		activo: boolean;
		participantes: Participante[];
	};
	inforepo: {
		web_url: string;
		ssh_url_to_repo: string;
		http_url_to_repo: string;
		statistics: {
			commit_count: number;
			storage_size: number;
			repository_size: number;
		};
		last_activity_at: string;
		visibility: string;
		default_branch: string;
	};
	statistics: any[];
}

export default function DetalleProyectoGitLab() {
	const { uuid } = useParams();
	const router = useRouter();

	const [proyecto, setProyecto] = useState<ProyectoDetalle | null>(null);
	const [loading, setLoading] = useState(true);
	const [userPerms, setUserPerms] = useState<string[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [busqueda, setBusqueda] = useState("");
	const [usuariosSugeridos, setUsuariosSugeridos] = useState<Participante[]>(
		[],
	);
	const [seleccionados, setSeleccionados] = useState<number[]>([]);
	const [editForm, setEditForm] = useState({
		nombre: "",
		descripcion: "",
		activo: true,
	});

	const formatAvatarUrl = (foto: any): string | null => {
		if (!foto) return null;
		if (typeof foto === "string") return foto;
		if (foto?.type === "Buffer" && Array.isArray(foto.data)) {
			try {
				const uint8 = new Uint8Array(foto.data);
				let binary = "";
				for (let i = 0; i < uint8.length; i++)
					binary += String.fromCharCode(uint8[i]);
				return `data:image/png;base64,${window.btoa(binary)}`;
			} catch {
				return null;
			}
		}
		return null;
	};

	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) setUserPerms(JSON.parse(stored));
		else logout();
	}, []);

	// El permiso "admin:total" permite realizar cualquier acción de edición
	const canEdit =
		userPerms.includes("admin:total") ||
		userPerms.includes("git:patchProyecto");

	const fetchDetalle = async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/proyectosgitlab/${uuid}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const data = await res.json();
			if (res.ok) setProyecto(data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDetalle();
	}, [uuid]);

	const buscarUsuarios = useCallback(async (val: string) => {
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);
			url.searchParams.append("filtroNombre", val);
			url.searchParams.append("filtroStatus", "activo");
			url.searchParams.append("filtroGitlab", "true");
			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();
			if (res.ok) setUsuariosSugeridos(data.info || []);
		} catch (error) {
			console.error(error);
		}
	}, []);

	useEffect(() => {
		if (isEditing) {
			const timer = setTimeout(() => buscarUsuarios(busqueda), 200);
			return () => clearTimeout(timer);
		}
	}, [busqueda, isEditing, buscarUsuarios]);

	const handleOpenEdit = () => {
		if (!proyecto) return;
		setEditForm({
			nombre: proyecto.info.nombre,
			descripcion: proyecto.info.descripcion,
			activo: proyecto.info.activo,
		});
		setSeleccionados(proyecto.info.participantes.map((p) => p.idusuario));
		setIsEditing(true);
	};

	const handleSave = async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/proyectosgitlab/${uuid}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ ...editForm, participantes: seleccionados }),
				},
			);
			if (res.status === 204) {
				setIsEditing(false);
				fetchDetalle();
			}
		} catch (error) {
			alert("Error de conexión");
		}
	};

	const chartData = useMemo(() => {
		if (!proyecto?.statistics) return [];
		const groups = proyecto.statistics.reduce((acc: any, c) => {
			const d = new Date(c.fecha).toLocaleDateString("es-ES", {
				day: "2-digit",
				month: "2-digit",
			});
			acc[d] = (acc[d] || 0) + 1;
			return acc;
		}, {});
		return Object.keys(groups)
			.map((date) => ({ name: date, commits: groups[date] }))
			.reverse();
	}, [proyecto?.statistics]);

	if (loading || !proyecto)
		return <div className="min-h-screen bg-[#F8FAFC]" />;

	return (
		<div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 overflow-x-hidden">
			<div className="max-w-7xl mx-auto">
				{/* TOP NAVIGATION */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
					<button
						onClick={() => router.back()}
						className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-orange-500 transition-all"
					>
						← VOLVER AL DASHBOARD
					</button>
					<div className="flex flex-wrap gap-3 w-full sm:w-auto">
						<a
							href={proyecto.inforepo.web_url}
							target="_blank"
							className="flex-1 sm:flex-none text-center bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
						>
							ABRIR EN GITLAB ↗
						</a>
						{canEdit && (
							<button
								onClick={handleOpenEdit}
								className="flex-1 sm:flex-none bg-slate-900 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl"
							>
								EDITAR_PROYECTO
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
					{/* SECCIÓN IZQUIERDA */}
					<div className="lg:col-span-8 space-y-12">
						<header className="space-y-4">
							<div className="flex flex-wrap items-center gap-3">
								<span
									className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${proyecto.info.activo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
								>
									{proyecto.info.activo
										? "● SISTEMA_ONLINE"
										: "○ SISTEMA_OFFLINE"}
								</span>
								<span className="text-[10px] font-mono text-slate-300">
									UUID_{proyecto.info.uuidproyecto.split("-")[0]}
								</span>
							</div>

							<h1 className="text-[10vw] sm:text-[clamp(3rem,7vw,6rem)] font-black text-slate-900 tracking-tighter uppercase leading-[0.9] break-words">
								{proyecto.info.nombre}
							</h1>
							<p className="text-slate-400 font-medium text-lg italic">
								{proyecto.info.descripcion ||
									"Sin descripción técnica disponible."}
							</p>
						</header>

						{/* CHART CARD */}
						<div className="bg-white p-8 md:p-12 rounded-[4rem] shadow-2xl shadow-slate-200/60 border border-slate-50">
							<div className="flex justify-between items-start mb-10">
								<div>
									<h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900">
										ACTIVIDAD SEMANAL
									</h3>
									<p className="text-[9px] font-bold text-slate-300 uppercase mt-1 tracking-widest">
										COMMITS REGISTRADOS EN LA RAMA{" "}
										{proyecto.inforepo.default_branch}
									</p>
								</div>
								<div className="text-right">
									<p className="text-6xl font-black text-orange-500 leading-none">
										{proyecto.inforepo.statistics.commit_count}
									</p>
									<p className="text-[9px] font-black text-slate-300 uppercase mt-2 tracking-widest">
										COMMITS_TOTALES
									</p>
								</div>
							</div>
							<div className="h-[300px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={chartData}>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#f1f5f9"
										/>
										<XAxis
											dataKey="name"
											axisLine={false}
											tickLine={false}
											tick={{
												fontSize: 10,
												fontWeight: "900",
												fill: "#cbd5e1",
											}}
											dy={15}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "25px",
												border: "none",
												boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
												fontSize: "11px",
												fontWeight: "900",
											}}
										/>
										<Area
											type="monotone"
											dataKey="commits"
											stroke="#f97316"
											strokeWidth={5}
											fill="#f97316"
											fillOpacity={0.05}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>

					{/* SECCIÓN DERECHA */}
					<div className="lg:col-span-4 space-y-8">
						<div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
							<h4 className="text-[12px] font-black uppercase text-slate-900 mb-10 tracking-[0.2em] italic">
								ESTADÍSTICAS DEL REPOSITORIO.
							</h4>
							<div className="space-y-8">
								{[
									{
										label: "VISIBILIDAD",
										value: proyecto.inforepo.visibility,
										highlight: false,
									},
									{
										label: "RAMA PRINCIPAL",
										value: proyecto.inforepo.default_branch,
										highlight: true,
									},
									{
										label: "ALMACENAMIENTO",
										value: (() => {
											const b = proyecto.inforepo.statistics.storage_size || 0;
											return `${(b / 1024).toFixed(2)} KB`;
										})(),
										highlight: false,
									},
									{
										label: "ÚLTIMO UPDATE",
										value: new Date(
											proyecto.inforepo.last_activity_at,
										).toLocaleDateString(),
										highlight: false,
									},
								].map((item, idx) => (
									<div
										key={idx}
										className="flex justify-between items-center border-b border-slate-50 pb-6"
									>
										<p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
											{item.label}
										</p>
										<p
											className={`text-[11px] font-black uppercase ${item.highlight ? "text-orange-500" : "text-slate-900"}`}
										>
											{item.value}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-100">
							<div className="flex justify-between items-center mb-4">
								<h4 className="text-[12px] font-black uppercase text-slate-900 tracking-widest">
									ACTIVE_TEAM
								</h4>
								<span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full">
									{proyecto.info.participantes.length}
								</span>
							</div>
							<div className="space-y-5">
								{proyecto.info.participantes.map((p) => (
									<div key={p.idusuario} className="flex items-center gap-5">
										<div className="w-12 h-12 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-xs">
											{formatAvatarUrl(p.fotoperfil) ? (
												<img
													src={formatAvatarUrl(p.fotoperfil)!}
													className="w-full h-full object-cover"
												/>
											) : (
												p.nombre[0]
											)}
										</div>
										<div className="truncate">
											<p className="text-[11px] font-black uppercase text-slate-900 truncate leading-tight">
												{p.nombre} {p.apellido1}
											</p>
											<p className="text-[9px] font-bold text-orange-500 italic lowercase tracking-tighter">
												@{p.gitlab}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MODAL CON BOTÓN DE ESTADO INCORPORADO */}
			{isEditing && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
					<div className="bg-white w-full max-w-6xl rounded-[4rem] md:rounded-[5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300">
						<div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
							{/* COLUMNA IZQUIERDA: FORMULARIO */}
							<div className="p-10 md:p-20 space-y-12 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-50">
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
									<h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">
										Edición Proyecto
									</h2>

									{/* BOTÓN DE CAMBIO DE ESTADO (ACTIVO/INACTIVO) */}
									<button
										type="button"
										onClick={() =>
											setEditForm({ ...editForm, activo: !editForm.activo })
										}
										className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 ${
											editForm.activo
												? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
												: "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
										}`}
									>
										{editForm.activo ? "● ACTIVO" : "○ INACTIVO"}
									</button>
								</div>

								<div className="space-y-10">
									<div className="space-y-3">
										<label className="text-[11px] font-black uppercase text-slate-300 ml-6 tracking-widest">
											NOMBRE_PROYECTO
										</label>
										<input
											className="w-full bg-slate-50/50 border-none rounded-[2rem] px-10 py-7 font-black text-[14px] uppercase outline-none focus:ring-4 focus:ring-orange-100 transition-all"
											value={editForm.nombre}
											onChange={(e) =>
												setEditForm({ ...editForm, nombre: e.target.value })
											}
										/>
									</div>

									<div className="space-y-3">
										<label className="text-[11px] font-black uppercase text-slate-300 ml-6 tracking-widest">
											DOCUMENTACIÓN
										</label>
										<textarea
											className="w-full bg-slate-50/50 border-none rounded-[2.5rem] px-10 py-8 font-bold text-slate-600 h-52 outline-none resize-none focus:ring-4 focus:ring-orange-100"
											value={editForm.descripcion}
											onChange={(e) =>
												setEditForm({
													...editForm,
													descripcion: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row items-center gap-8 pt-6">
									<button
										onClick={() => setIsEditing(false)}
										className="text-[11px] font-black uppercase text-slate-400 hover:text-slate-900 tracking-[0.2em] transition-colors"
									>
										DESCARTAR
									</button>
									<button
										onClick={handleSave}
										className="w-full sm:w-auto bg-slate-900 text-white px-14 py-7 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-orange-600 shadow-2xl transition-all active:scale-95"
									>
										Sincronizar
									</button>
								</div>
							</div>

							{/* COLUMNA DERECHA: ASIGNACIÓN DE EQUIPO */}
							<div className="bg-slate-50/30 p-10 md:p-20 flex flex-col h-full overflow-hidden">
								<h3 className="text-[14px] font-black uppercase text-slate-900 tracking-widest italic mb-10">
									USER_ASSIGN ({seleccionados.length})
								</h3>
								<div className="relative mb-10">
									<input
										type="text"
										placeholder="BUSCAR_USUARIO..."
										className="w-full bg-white border border-slate-100 rounded-[1.8rem] px-10 py-5 font-black text-[11px] uppercase outline-none focus:border-orange-500 shadow-sm transition-all"
										value={busqueda}
										onChange={(e) => setBusqueda(e.target.value)}
									/>
								</div>
								<div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
									{usuariosSugeridos.map((u) => {
										const isSelected = seleccionados.includes(u.idusuario);
										const avatar = formatAvatarUrl(u.fotoperfil);
										return (
											<div
												key={u.idusuario}
												onClick={() =>
													setSeleccionados((prev) =>
														isSelected
															? prev.filter((id) => id !== u.idusuario)
															: [...prev, u.idusuario],
													)
												}
												className={`flex items-center justify-between p-6 rounded-[2.5rem] cursor-pointer transition-all border-2 ${isSelected ? "bg-white border-orange-500 shadow-xl scale-[1.02]" : "bg-white border-transparent hover:border-slate-100 shadow-sm"}`}
											>
												<div className="flex items-center gap-5">
													<div className="w-14 h-14 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-xs">
														{avatar ? (
															<img
																src={avatar}
																className="w-full h-full object-cover"
															/>
														) : (
															u.nombre[0]
														)}
													</div>
													<div className="truncate">
														<p className="text-[12px] font-black uppercase truncate leading-tight text-slate-900">
															{u.nombre} {u.apellido1}
														</p>
														<p className="text-[10px] font-bold text-orange-500 mt-0.5">
															@{u.gitlab}
														</p>
													</div>
												</div>
												<div
													className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] transition-all ${isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-slate-100 text-transparent"}`}
												>
													✓
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
