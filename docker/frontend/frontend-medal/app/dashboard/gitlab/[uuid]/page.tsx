"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
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
		if (foto.type === "Buffer" && Array.isArray(foto.data)) {
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
			url.searchParams.append("limit", "20");
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
		<div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12">
			<div className="max-w-7xl mx-auto">
				{/* HEADER ACTIONS */}
				<div className="flex justify-between items-center mb-10">
					<button
						onClick={() => router.back()}
						className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-orange-500 transition-all"
					>
						← VOLVER AL DASHBOARD
					</button>
					<div className="flex gap-4">
						<a
							href={proyecto.inforepo.web_url}
							target="_blank"
							className="bg-white border border-slate-200 text-slate-900 px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
						>
							Abrir en gitlab ↗
						</a>
						{canEdit && (
							<button
								onClick={handleOpenEdit}
								className="bg-slate-900 text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl"
							>
								Edición del repositorio.
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* IZQUIERDA: IDENTIDAD Y ACTIVIDAD */}
					<div className="lg:col-span-8 space-y-10">
						<header>
							<div className="flex items-center gap-3 mb-4">
								<span
									className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${proyecto.info.activo ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
								>
									{proyecto.info.activo
										? "● Sistema_Online"
										: "○ Sistema_Offline"}
								</span>
								<span className="text-[10px] font-mono text-slate-300">
									UUID_{proyecto.info.uuidproyecto.split("-")[0]}
								</span>
							</div>
							<h1 className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85] mb-6">
								{proyecto.info.nombre}
							</h1>
							<p className="text-slate-500 font-medium text-lg leading-relaxed max-w-2xl">
								{proyecto.info.descripcion}
							</p>
						</header>

						{/* GRÁFICA DE ACTIVIDAD */}
						<div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-slate-50">
							<div className="flex justify-between items-end mb-8">
								<div>
									<h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">
										Actividad Semanal
									</h3>
									<p className="text-[9px] font-bold text-slate-300 uppercase italic">
										Commits registrados en la rama{" "}
										{proyecto.inforepo.default_branch}
									</p>
								</div>
								<div className="text-right">
									<p className="text-5xl font-black text-orange-500 leading-none">
										{proyecto.inforepo.statistics.commit_count}
									</p>
									<p className="text-[10px] font-black text-slate-400 uppercase mt-2">
										Commits_Totales
									</p>
								</div>
							</div>
							<div className="h-[250px] w-full">
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
											dy={10}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "20px",
												border: "none",
												boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
												fontSize: "10px",
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

						{/* CLONE INFO */}
						<div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
							<div className="absolute top-0 right-0 p-10 opacity-10">
								<svg
									width="100"
									height="100"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M2.25 18.75a6 6 0 0111.75-1.5h6.75a.75.75 0 010 1.5h-6.75a6 6 0 01-11.75 0z" />
								</svg>
							</div>
							<p className="text-orange-500 font-black text-[10px] uppercase tracking-[0.4em] mb-8">
								GIT Clone Endpoints
							</p>
							<div className="space-y-6 relative z-10">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="bg-white/5 p-5 rounded-2xl border border-white/10">
										<p className="text-[8px] font-bold text-slate-500 uppercase mb-2">
											Clone HTTP
										</p>
										<p className="font-mono text-xs text-orange-200 select-all truncate">
											{proyecto.inforepo.http_url_to_repo}
										</p>
									</div>
									<div className="bg-white/5 p-5 rounded-2xl border border-white/10">
										<p className="text-[8px] font-bold text-slate-500 uppercase mb-2">
											Clone SSH
										</p>
										<p className="font-mono text-xs text-slate-400 select-all truncate">
											{proyecto.inforepo.ssh_url_to_repo}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* DERECHA: ESTADÍSTICAS Y EQUIPO */}
					<div className="lg:col-span-4 space-y-10">
						{/* REPO METRICS */}
						<div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100">
							<h4 className="text-[11px] font-black uppercase text-slate-900 mb-8 tracking-widest italic">
								Estadísticas del repositorio.
							</h4>
							<div className="space-y-6">
								<div className="flex justify-between items-center border-b border-slate-50 pb-4">
									<p className="text-[9px] font-black text-slate-300 uppercase">
										Visibilidad
									</p>
									<p className="text-[10px] font-black text-slate-900 uppercase">
										{proyecto.inforepo.visibility}
									</p>
								</div>
								<div className="flex justify-between items-center border-b border-slate-50 pb-4">
									<p className="text-[9px] font-black text-slate-300 uppercase">
										Rama principal
									</p>
									<p className="text-[10px] font-black text-orange-500">
										{proyecto.inforepo.default_branch}
									</p>
								</div>
								<div className="flex justify-between items-center border-b border-slate-50 pb-4">
									<p className="text-[9px] font-black text-slate-300 uppercase">
										Almacenamiento
									</p>
									<p className="text-[10px] font-black text-slate-900 uppercase">
										{(() => {
											// GitLab suele devolver esto en Bytes.
											// Usamos repository_size como prioridad si storage_size es 0
											const bytes =
												proyecto.inforepo.statistics.storage_size ||
												proyecto.inforepo.statistics.repository_size ||
												0;

											if (bytes === 0) return "0 KB";
											if (bytes < 1024) return `${bytes} B`;
											const kb = bytes / 1024;
											if (kb < 1024) return `${kb.toFixed(2)} KB`;
											const mb = kb / 1024;
											return `${mb.toFixed(2)} MB`;
										})()}
									</p>
								</div>
								<div className="flex justify-between items-center">
									<p className="text-[9px] font-black text-slate-300 uppercase">
										Último Update
									</p>
									<p className="text-[10px] font-black text-slate-900 uppercase">
										{new Date(
											proyecto.inforepo.last_activity_at,
										).toLocaleDateString()}
									</p>
								</div>
							</div>
						</div>

						{/* TEAM */}
						<div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100">
							<div className="flex justify-between items-center mb-6">
								<h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">
									Active_Team
								</h4>
								<span className="bg-slate-900 text-white text-[9px] px-2 py-1 rounded-lg">
									{proyecto.info.participantes.length}
								</span>
							</div>
							<div className="space-y-4">
								{proyecto.info.participantes.map((p) => {
									const avatar = formatAvatarUrl(p.fotoperfil);
									return (
										<div
											key={p.idusuario}
											className="flex items-center gap-4 group"
										>
											<div className="w-10 h-10 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-[10px] group-hover:bg-orange-500 transition-colors">
												{avatar ? (
													<img
														src={avatar}
														className="w-full h-full object-cover"
													/>
												) : (
													p.nombre[0]
												)}
											</div>
											<div className="truncate">
												<p className="text-[10px] font-black uppercase text-slate-900 truncate leading-tight">
													{p.nombre} {p.apellido1}
												</p>
												<p className="text-[8px] font-bold text-orange-500 italic uppercase">
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

			{/* MODAL DE EDICIÓN (MANTENIDO IGUAL) */}
			{isEditing && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
					<div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
						<div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
							<div className="p-12 space-y-8 overflow-y-auto border-r border-slate-50">
								<h2 className="text-4xl font-black text-slate-900 uppercase italic">
									Patch_Config
								</h2>
								<div className="space-y-4">
									<label className="text-[10px] font-black uppercase text-slate-400 ml-4">
										Nombre_Proyecto
									</label>
									<input
										className="w-full bg-slate-50 border-none rounded-[2rem] px-8 py-5 font-black text-[12px] uppercase outline-none focus:ring-2 focus:ring-orange-500"
										value={editForm.nombre}
										onChange={(e) =>
											setEditForm({ ...editForm, nombre: e.target.value })
										}
									/>
									<label className="text-[10px] font-black uppercase text-slate-400 ml-4">
										Documentación
									</label>
									<textarea
										className="w-full bg-slate-50 border-none rounded-[2rem] px-8 py-5 font-bold text-slate-600 h-32 outline-none resize-none"
										value={editForm.descripcion}
										onChange={(e) =>
											setEditForm({ ...editForm, descripcion: e.target.value })
										}
									/>
								</div>
								<div className="flex gap-4">
									<button
										onClick={() => setIsEditing(false)}
										className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400"
									>
										Descartar
									</button>
									<button
										onClick={handleSave}
										className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 shadow-xl"
									>
										Sincronizar Cambios
									</button>
								</div>
							</div>
							<div className="bg-slate-50/50 p-12 flex flex-col h-full overflow-hidden">
								<h3 className="text-[11px] font-black uppercase text-slate-900 mb-6 tracking-widest">
									Gestionar_Equipo ({seleccionados.length})
								</h3>
								<input
									type="text"
									placeholder="BUSCAR USUARIO..."
									className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-black text-[10px] uppercase outline-none mb-6 focus:border-orange-500"
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value)}
								/>
								<div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll">
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
												className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all ${isSelected ? "bg-orange-500 text-white shadow-lg" : "bg-white hover:bg-slate-100 shadow-sm"}`}
											>
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-white font-black text-[9px]">
														{avatar ? (
															<img
																src={avatar}
																className="w-full h-full object-cover"
															/>
														) : (
															u.nombre[0]
														)}
													</div>
													<div className="truncate text-[10px] font-black uppercase">
														{u.nombre} {u.apellido1}
													</div>
												</div>
												<div className="text-[10px]">
													{isSelected ? "●" : "○"}
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
