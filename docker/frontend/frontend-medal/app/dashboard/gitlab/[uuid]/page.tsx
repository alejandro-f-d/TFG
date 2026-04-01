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
							className="flex-1 sm:flex-none text-center bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
						>
							ABRIR GITLAB ↗
						</a>
						{canEdit && (
							<button
								onClick={handleOpenEdit}
								className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl"
							>
								EDITAR_PROYECTO
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
					{/* SECCIÓN IZQUIERDA (CONTENIDO PRINCIPAL) */}
					<div className="lg:col-span-8 space-y-12">
						<header className="space-y-4">
							<div className="flex flex-wrap items-center gap-3">
								<span
									className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${proyecto.info.activo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
								>
									{proyecto.info.activo
										? "● Sitema_Online"
										: "○ Sistema_Offline"}
								</span>
								<span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-md">
									ID_{proyecto.info.uuidproyecto.split("-")[0].toUpperCase()}
								</span>
							</div>

							{/* TÍTULO ADAPTATIVO */}
							<h1 className="text-[12vw] sm:text-[clamp(3.5rem,8vw,6.5rem)] font-black text-slate-900 tracking-tighter uppercase leading-[0.8] break-words">
								{proyecto.info.nombre}
							</h1>

							<p className="text-slate-500 font-medium text-base md:text-xl leading-relaxed max-w-2xl italic">
								{proyecto.info.descripcion ||
									"Sin descripción técnica disponible."}
							</p>
						</header>

						{/* CHART CARD */}
						<div className="bg-white p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
							<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
								<div>
									<h3 className="text-[13px] font-black uppercase tracking-widest text-slate-900">
										Actividad_Semanal
									</h3>
									<p className="text-[10px] font-bold text-slate-300 uppercase mt-1">
										Branch: {proyecto.inforepo.default_branch}
									</p>
								</div>
								<div className="bg-orange-50 px-6 py-4 rounded-3xl text-center min-w-[140px]">
									<p className="text-4xl md:text-5xl font-black text-orange-500 leading-none">
										{proyecto.inforepo.statistics.commit_count}
									</p>
									<p className="text-[9px] font-black text-orange-300 uppercase mt-2">
										Commits_Totales
									</p>
								</div>
							</div>
							<div className="h-[250px] md:h-[300px] w-full">
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
											tick={{ fontSize: 9, fontWeight: "900", fill: "#cbd5e1" }}
											dy={10}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "20px",
												border: "none",
												boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
												fontSize: "10px",
												fontWeight: "900",
											}}
										/>
										<Area
											type="monotone"
											dataKey="commits"
											stroke="#f97316"
											strokeWidth={6}
											fill="#f97316"
											fillOpacity={0.08}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* CLONE INFO */}
						<div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden group">
							<div className="relative z-10 space-y-8">
								<p className="text-orange-500 font-black text-[11px] uppercase tracking-[0.4em]">
									GIT_ENDPOINTS
								</p>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-3">
										<p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
											Protocolo_HTTP
										</p>
										<div className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 font-mono text-[11px] text-orange-200 truncate select-all">
											{proyecto.inforepo.http_url_to_repo}
										</div>
									</div>
									<div className="space-y-3">
										<p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
											Protocolo_SSH
										</p>
										<div className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-2xl border border-white/10 font-mono text-[11px] text-slate-400 truncate select-all">
											{proyecto.inforepo.ssh_url_to_repo}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* SECCIÓN DERECHA (MÉTRICAS Y TEAM) */}
					<div className="lg:col-span-4 space-y-8">
						{/* ESTADÍSTICAS */}
						<div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
							<h4 className="text-[12px] font-black uppercase text-slate-900 mb-10 tracking-[0.2em] italic">
								Estadísticas_Repo
							</h4>
							<div className="space-y-7">
								{[
									{
										label: "Visibilidad",
										value: proyecto.inforepo.visibility,
										highlight: false,
									},
									{
										label: "Rama principal",
										value: proyecto.inforepo.default_branch,
										highlight: true,
									},
									{
										label: "Almacenamiento",
										value: (() => {
											const b =
												proyecto.inforepo.statistics.storage_size ||
												proyecto.inforepo.statistics.repository_size ||
												0;
											if (b === 0) return "0 KB";
											if (b < 1024) return `${b} B`;
											const kb = b / 1024;
											return kb < 1024
												? `${kb.toFixed(2)} KB`
												: `${(kb / 1024).toFixed(2)} MB`;
										})(),
										highlight: false,
									},
									{
										label: "Último Update",
										value: new Date(
											proyecto.inforepo.last_activity_at,
										).toLocaleDateString(),
										highlight: false,
									},
								].map((item, idx) => (
									<div
										key={idx}
										className="flex justify-between items-center border-b border-slate-50 pb-5"
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

						{/* TEAM CARD */}
						<div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
							<div className="flex justify-between items-center mb-10">
								<h4 className="text-[12px] font-black uppercase text-slate-900 tracking-widest">
									Active_Team
								</h4>
								<span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-xl">
									{proyecto.info.participantes.length}
								</span>
							</div>
							<div className="space-y-5">
								{proyecto.info.participantes.map((p) => {
									const avatar = formatAvatarUrl(p.fotoperfil);
									return (
										<div
											key={p.idusuario}
											className="flex items-center gap-5 group"
										>
											<div className="w-12 h-12 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-xs ring-4 ring-transparent group-hover:ring-orange-100 transition-all">
												{avatar ? (
													<img
														src={avatar}
														alt="P"
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
												<p className="text-[9px] font-bold text-orange-500 italic uppercase tracking-tighter">
													@{p.gitlab}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MODAL RESPONSIVE */}
			{isEditing && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
					<div className="bg-white w-full max-w-5xl rounded-[3rem] md:rounded-[5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-300">
						<div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
							{/* MODAL IZQ: FORM */}
							<div className="p-8 md:p-16 space-y-10 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100">
								<h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
									Patch_Data
								</h2>
								<div className="space-y-6">
									<div className="space-y-2">
										<label className="text-[10px] font-black uppercase text-slate-400 ml-4">
											Nombre_Proyecto
										</label>
										<input
											className="w-full bg-slate-50 border-none rounded-[2rem] px-8 py-5 font-black text-[13px] uppercase outline-none focus:ring-4 focus:ring-orange-100 transition-all"
											value={editForm.nombre}
											onChange={(e) =>
												setEditForm({ ...editForm, nombre: e.target.value })
											}
										/>
									</div>
									<div className="space-y-2">
										<label className="text-[10px] font-black uppercase text-slate-400 ml-4">
											Documentación
										</label>
										<textarea
											className="w-full bg-slate-50 border-none rounded-[2rem] px-8 py-5 font-bold text-slate-600 h-40 outline-none resize-none focus:ring-4 focus:ring-orange-100"
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
								<div className="flex flex-col sm:flex-row gap-4">
									<button
										onClick={() => setIsEditing(false)}
										className="flex-1 py-5 text-[11px] font-black uppercase text-slate-400 hover:text-slate-900"
									>
										Descartar
									</button>
									<button
										onClick={handleSave}
										className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-orange-600 shadow-2xl transition-all active:scale-95"
									>
										Guardar_Patch
									</button>
								</div>
							</div>

							{/* MODAL DER: EQUIPO */}
							<div className="bg-slate-50/50 p-8 md:p-16 flex flex-col h-full overflow-hidden">
								<div className="flex justify-between items-center mb-8">
									<h3 className="text-[12px] font-black uppercase text-slate-900 tracking-widest italic">
										User_Assign ({seleccionados.length})
									</h3>
								</div>
								<input
									type="text"
									placeholder="BUSCAR_USUARIO..."
									className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-8 py-4 font-black text-[11px] uppercase outline-none mb-8 focus:border-orange-500 shadow-sm"
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value)}
								/>
								<div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
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
												className={`flex items-center justify-between p-5 rounded-[2rem] cursor-pointer transition-all ${isSelected ? "bg-orange-500 text-white shadow-xl scale-[1.02]" : "bg-white hover:bg-slate-100 border border-slate-100 shadow-sm"}`}
											>
												<div className="flex items-center gap-4">
													<div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-white font-black text-[10px]">
														{avatar ? (
															<img
																src={avatar}
																alt="U"
																className="w-full h-full object-cover"
															/>
														) : (
															u.nombre[0]
														)}
													</div>
													<div className="truncate">
														<p className="text-[11px] font-black uppercase truncate leading-none mb-1">
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
													className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${isSelected ? "bg-white border-white text-orange-500" : "border-slate-100 text-transparent"}`}
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
