"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

interface UsuarioAsociado {
	idUsuario: number;
	nombre: string;
	apellido1: string;
}

interface PermisoAsociado {
	idPermiso: number;
	nombre: string;
	alias: string;
}

interface RoleItem {
	idrole: number;
	uuidrole: string;
	nombre: string;
	descripcion: string | null;
	fechacreacion: string;
	usuarios: UsuarioAsociado[];
	permisos: PermisoAsociado[];
}

export default function RolesPage() {
	const router = useRouter();
	const [roles, setRoles] = useState<RoleItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Fetch de Roles
	const fetchRoles = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/rol`);
			url.searchParams.append("page", page.toString());
			url.searchParams.append("limit", "5");
			if (searchTerm) url.searchParams.append("filtroNombre", searchTerm);

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (res.status === 401) logout();

			const data = await res.json();
			if (res.ok) {
				setRoles(data.info?.rows || []);
				setTotalPages(data.info?.pagination?.totalPages || 1);
			}
		} catch (error) {
			console.error("Error API Roles:", error);
		} finally {
			setLoading(false);
		}
	}, [page, searchTerm]);

	useEffect(() => {
		const timer = setTimeout(fetchRoles, 400);
		return () => clearTimeout(timer);
	}, [fetchRoles]);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
					<div>
						<h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Roles de <span className="text-blue-600">Acceso</span>
						</h1>
						<p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase mt-3">
							Configuración de perfiles y permisos
						</p>
					</div>
					<button
						onClick={() => router.push("/dashboard/roles/create")}
						className="bg-slate-900 text-white px-8 py-5 rounded-[2.2rem] font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-blue-600 border-b-4 border-black transition-all active:translate-y-1 active:border-b-0"
					>
						+ Crear Nuevo Rol
					</button>
				</div>

				{/* BUSCADOR */}
				<div className="bg-white rounded-[3rem] p-3 shadow-xl shadow-slate-200/50 border border-white mb-10 flex items-center">
					<div className="w-14 h-14 flex items-center justify-center text-xl grayscale opacity-30">
						🛡️
					</div>
					<input
						type="text"
						placeholder="FILTRAR POR NOMBRE DE ROL..."
						value={searchTerm}
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setPage(1);
						}}
						className="flex-1 bg-transparent border-none focus:ring-0 px-4 font-black text-[13px] text-slate-950 tracking-[0.2em] uppercase outline-none placeholder:text-slate-400"
					/>
				</div>

				{/* LISTADO DE ROLES */}
				<div className="space-y-6">
					{loading ? (
						[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-40 bg-white/60 animate-pulse rounded-[3rem]"
							></div>
						))
					) : roles.length > 0 ? (
						roles.map((rol) => (
							<div
								key={rol.idrole}
								onClick={() => router.push(`/dashboard/roles/${rol.uuidrole}`)}
								className="group bg-white p-8 rounded-[3rem] border border-white shadow-sm hover:shadow-2xl hover:scale-[1.01] transition-all cursor-pointer flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
							>
								{/* Icono de Rol */}
								<div
									className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:rotate-6 ${
										rol.nombre.toLowerCase().includes("admin")
											? "bg-purple-50 text-purple-600"
											: "bg-blue-50 text-blue-600"
									}`}
								>
									{rol.nombre.toLowerCase().includes("admin") ? "👑" : "👤"}
								</div>

								{/* Info Principal */}
								<div className="flex-1 space-y-3 text-center md:text-left">
									<div>
										<h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
											{rol.nombre}
										</h3>
										<p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-2">
											{rol.descripcion || "Sin descripción asignada"}
										</p>
									</div>

									{/* Mini Permisos Tags */}
									<div className="flex flex-wrap gap-2 justify-center md:justify-start">
										{rol.permisos.slice(0, 3).map((p) => (
											<span
												key={p.idPermiso}
												className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[7px] font-black text-slate-400 uppercase tracking-tighter"
											>
												{p.alias !== "null:null" ? p.alias : "Básico"}
											</span>
										))}
										{rol.permisos.length > 3 && (
											<span className="text-[7px] font-black text-blue-500 uppercase self-center">
												+{rol.permisos.length - 3} más
											</span>
										)}
									</div>
								</div>

								{/* Estadísticas del Rol */}
								<div className="flex gap-4 px-10 border-l-2 border-slate-50 border-r-2 mr-4">
									<div className="text-center">
										<p className="text-xl font-black text-slate-900 leading-none">
											{rol.usuarios.length}
										</p>
										<p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter mt-1 text-center">
											Usuarios
										</p>
									</div>
									<div className="w-[1px] h-8 bg-slate-100 self-center"></div>
									<div className="text-center">
										<p className="text-xl font-black text-slate-900 leading-none">
											{rol.permisos.length}
										</p>
										<p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter mt-1 text-center">
											Permisos
										</p>
									</div>
								</div>

								{/* Acceso */}
								<div className="h-16 w-16 bg-slate-50 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M5 12h14M12 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						))
					) : (
						<div className="bg-white rounded-[4rem] p-32 text-center border-4 border-dashed border-slate-100 font-black text-[10px] uppercase tracking-[0.5em] text-slate-300">
							No hay roles definidos
						</div>
					)}
				</div>

				{/* PAGINACIÓN */}
				{totalPages > 1 && (
					<div className="mt-16 flex justify-center items-center gap-6">
						<button
							disabled={page === 1}
							onClick={() => {
								setPage((p) => p - 1);
								window.scrollTo(0, 0);
							}}
							className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center font-black shadow-md hover:bg-slate-900 hover:text-white transition-all disabled:opacity-20"
						>
							←
						</button>
						<div className="bg-white px-10 py-4 rounded-2xl shadow-sm border border-slate-100 font-black text-slate-900 tracking-widest uppercase text-[10px]">
							Página {page} <span className="text-slate-200 mx-2">/</span>{" "}
							{totalPages}
						</div>
						<button
							disabled={page === totalPages}
							onClick={() => {
								setPage((p) => p + 1);
								window.scrollTo(0, 0);
							}}
							className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center font-black shadow-md hover:bg-slate-900 hover:text-white transition-all disabled:opacity-20"
						>
							→
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
