"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import BackButton from "@/components/backButton/BackButton";

// --- INTERFACES ---
interface Participante {
	idUsuario: number;
	nombre: string;
	apellidos: string;
	fotoperfil: string | null;
}

interface ProyectoGitLab {
	idproyecto: number;
	uuidproyecto: string;
	nombre: string;
	descripcion: string;
	fechainicio: string;
	fechafin: string | null;
	activo: boolean;
	participantes: Participante[];
}

interface PaginationData {
	totalItems: number;
	totalPages: number;
	currentPage: number;
}

/**
 * Convierte un string Hexadecimal (formato \x...) a Base64 para mostrar en <img>
 */
const hexToImageBase64 = (hex: string | null) => {
	if (!hex) return null;
	try {
		// Eliminamos el prefijo \x si existe
		const cleanHex = hex.startsWith("\\x") ? hex.slice(2) : hex;

		// Convertimos hex a pares de bytes
		const matches = cleanHex.match(/.{1,2}/g);
		if (!matches) return null;

		const bytes = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));

		// Convertimos a string binario
		let binary = "";
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}

		// Retornamos el data URI (asumiendo JPEG por defecto del buffer \xffd8)
		return `data:image/jpeg;base64,${window.btoa(binary)}`;
	} catch (e) {
		console.error("Error al procesar fotoperfil:", e);
		return null;
	}
};

export default function GitLabProjectsPage() {
	const router = useRouter();

	// ESTADOS
	const [proyectos, setProyectos] = useState<ProyectoGitLab[]>([]);
	const [pagination, setPagination] = useState<PaginationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const [userPerms, setUserPerms] = useState<string[]>([]);

	// --- PERMISOS ---
	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);
			const canView =
				parsed.includes("admin:total") ||
				parsed.includes("gitlab:getProyecto") ||
				parsed.includes("gitlab:postProyecto");
			if (!canView) router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const canCreate =
		userPerms.includes("admin:total") || userPerms.includes("git:postProyecto");

	// --- FETCH DATA ---
	const fetchProyectos = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const url = new URL(
				`${process.env.NEXT_PUBLIC_API_URL}/api/proyectosgitlab`,
			);

			url.searchParams.append("page", page.toString());
			url.searchParams.append("limit", "6");
			if (searchTerm) url.searchParams.append("filtroNombre", searchTerm);

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});

			const data = await res.json();

			if (res.ok) {
				setProyectos(data.info.rows || []);
				setPagination(data.info.pagination || data.pagination);
			} else {
				setProyectos([]);
			}
		} catch (error) {
			console.error("Error fetching projects:", error);
		} finally {
			setLoading(false);
		}
	}, [page, searchTerm]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			fetchProyectos();
		}, 300);
		return () => clearTimeout(delayDebounceFn);
	}, [fetchProyectos]);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="mb-6">
				<BackButton />
			</div>

			<div className="max-w-7xl mx-auto">
				{/* HEADER */}
				<header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
					<div>
						<h1 className="text-8xl md:text-9xl font-black text-slate-900 tracking-tighter uppercase leading-[0.8]">
							GitLab
							<br />
							<span className="text-orange-500">Repos.</span>
						</h1>
						<p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
							Gestión de infraestructura de código en el laboratorio.
						</p>
					</div>

					{canCreate && (
						<button
							onClick={() => router.push("/dashboard/gitlab/nuevo")}
							className="bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-2xl shadow-slate-200 active:scale-95"
						>
							+ Crear Proyecto
						</button>
					)}
				</header>

				{/* BUSCADOR */}
				<div className="mb-12 flex flex-col md:flex-row gap-4">
					<div className="flex-1 relative">
						<input
							type="text"
							placeholder="BUSCAR PROYECTO POR NOMBRE..."
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setPage(1);
							}}
							className="w-full bg-white border-2 border-slate-950 rounded-[2rem] px-8 py-6 font-black text-[12px] text-slate-950 uppercase tracking-[0.3em] shadow-xl focus:ring-8 focus:ring-orange-100/50 focus:border-orange-600 transition-all outline-none placeholder:text-slate-300"
						/>
						<span className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 font-black text-xs italic uppercase">
							Search_Engine
						</span>
					</div>
				</div>

				{/* GRID DE PROYECTOS */}
				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-80 bg-slate-100 rounded-[3.5rem] animate-pulse"
							></div>
						))}
					</div>
				) : proyectos.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{proyectos.map((proyecto) => (
							<div
								key={proyecto.uuidproyecto}
								onClick={() =>
									router.push(`/dashboard/gitlab/${proyecto.uuidproyecto}`)
								}
								className="group bg-white p-8 rounded-[3.5rem] border border-slate-50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-orange-100 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
							>
								{/* MARCA DE AGUA UNIFICADA (Estilo v4/v6) */}
								<div className="absolute -top-2 -right-2 p-6 opacity-[0.03] text-[80px] font-black italic leading-none pointer-events-none select-none text-slate-900 group-hover:opacity-[0.07] transition-opacity">
									GIT
								</div>

								<div>
									<div className="flex justify-between items-start mb-6">
										<div
											className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${proyecto.activo ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
										>
											{proyecto.activo ? "● Activo" : "○ Inactivo"}
										</div>
										<span className="text-[10px] font-mono text-slate-300 relative z-10">
											ID_{proyecto.idproyecto}
										</span>
									</div>

									<h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-tight mb-2 group-hover:text-orange-600 transition-colors relative z-10">
										{proyecto.nombre}
									</h3>
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight line-clamp-2 mb-8">
										{proyecto.descripcion || "Sin descripción disponible."}
									</p>
								</div>

								<div className="space-y-6">
									{/* PARTICIPANTES CON FOTO O INICIALES */}
									<div className="flex -space-x-3">
										{proyecto.participantes?.slice(0, 4).map((p) => {
											const avatarData = hexToImageBase64(p.fotoperfil);
											return (
												<div
													key={p.idUsuario}
													title={`${p.nombre} ${p.apellidos}`}
													className="w-10 h-10 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm shrink-0"
												>
													{avatarData ? (
														<img
															src={avatarData}
															alt={p.nombre}
															className="w-full h-full object-cover"
														/>
													) : (
														<span>
															{p.nombre.charAt(0)}
															{p.apellidos ? p.apellidos.charAt(0) : ""}
														</span>
													)}
												</div>
											);
										})}
										{proyecto.participantes?.length > 4 && (
											<div className="w-10 h-10 rounded-full border-4 border-white bg-orange-500 flex items-center justify-center text-[10px] font-black text-white z-10">
												+{proyecto.participantes.length - 4}
											</div>
										)}
									</div>

									<div className="pt-6 border-t border-slate-50 flex justify-between items-center">
										<span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
											{new Date(proyecto.fechainicio).toLocaleDateString()}
										</span>
										<span className="text-orange-500 font-black text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
											ABRIR REPO →
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="bg-white rounded-[4rem] p-20 text-center border-2 border-dashed border-slate-100">
						<p className="text-slate-300 font-black uppercase tracking-[0.5em]">
							No se han encontrado proyectos
						</p>
					</div>
				)}

				{/* PAGINACIÓN */}
				{pagination && pagination.totalPages > 1 && (
					<div className="mt-16 flex justify-center items-center gap-4">
						<button
							disabled={page === 1}
							onClick={() => setPage((p) => p - 1)}
							className="p-6 rounded-full bg-white border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-all font-black text-[10px]"
						>
							← ANTERIOR
						</button>
						<div className="bg-slate-900 text-white px-8 py-5 rounded-full font-black text-[10px] tracking-widest">
							PAG {pagination.currentPage} / {pagination.totalPages}
						</div>
						<button
							disabled={page === pagination.totalPages}
							onClick={() => setPage((p) => p + 1)}
							className="p-6 rounded-full bg-white border border-slate-100 disabled:opacity-30 hover:bg-slate-50 transition-all font-black text-[10px]"
						>
							SIGUIENTE →
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
