"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

interface Role {
	id: number;
	nombre: string;
}

interface UserListItem {
	idusuario: number;
	uuidusuario: string;
	nombre: string;
	apellido1: string;
	apellido2: string;
	correoinstitucional: string;
	activo: boolean;
	fotoperfil?: any;
	esresponsable: boolean;
	roles: Role[];
	puertas: { id: number; nombre: string }[];
	maquinas_propiedad: { id: number; nombre: string }[];
}

const requiredCreatePermissions = ["usr:create", "admin:total"];

// --- Etiquetas de Roles (Colores según importancia) ---
const RoleTag = ({ name }: { name: string }) => {
	const isHighLevel =
		name.toLowerCase().includes("admin") ||
		name.toLowerCase().includes("responsable");
	return (
		<span
			className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
				isHighLevel
					? "bg-purple-50 text-purple-600 border-purple-100 shadow-sm"
					: "bg-blue-50 text-blue-600 border-blue-100"
			}`}
		>
			{name}
		</span>
	);
};

export default function AdminUsersPage() {
	const router = useRouter();
	const [users, setUsers] = useState<UserListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [canCreate, setCanCreate] = useState(false);

	// Filtros
	const [statusTab, setStatusTab] = useState<"activo" | "inactivo">("activo");
	const [nameFilter, setNameFilter] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	// Verificación de Permisos
	useEffect(() => {
		const perms = JSON.parse(localStorage.getItem("permisos") || "[]");
		setCanCreate(requiredCreatePermissions.some((p) => perms.includes(p)));
	}, []);

	// Fetch de Datos
	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/user`);
			url.searchParams.append("page", page.toString());
			url.searchParams.append("limit", "5");
			url.searchParams.append("filtroStatus", statusTab);
			if (nameFilter) url.searchParams.append("filtroNombre", nameFilter);

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.status === 401) logout();

			const data = await res.json();
			if (res.ok) {
				setUsers(data.info || []);
				setTotalPages(data.pagination?.totalPages || 1);
			} else {
				setUsers([]);
			}
		} catch (error) {
			console.error("Error al obtener usuarios:", error);
		} finally {
			setLoading(false);
		}
	}, [page, statusTab, nameFilter]);

	useEffect(() => {
		const timer = setTimeout(fetchUsers, 400);
		return () => clearTimeout(timer);
	}, [fetchUsers]);

	const getAvatarUrl = (foto: any) => {
		if (!foto) return null;
		if (foto.type === "Buffer") {
			const binary = foto.data.reduce(
				(acc: string, b: number) => acc + String.fromCharCode(b),
				"",
			);
			return `data:image/png;base64,${btoa(binary)}`;
		}
		return typeof foto === "string" ? foto : null;
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* HEADER SECCIÓN */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
					<div className="space-y-1">
						<h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Gestión de <span className="text-blue-600">Usuarios</span>
						</h1>
						<p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase opacity-70">
							Control centralizado de acceso y recursos
						</p>
					</div>
					{canCreate && (
						<button
							onClick={() => router.push("/dashboard/usuarios/create")}
							className="bg-slate-900 text-white px-10 py-5 rounded-[2.2rem] font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-blue-600 border-b-4 border-black transition-all active:translate-y-1 active:border-b-0"
						>
							Nuevo Usuario
						</button>
					)}
				</div>

				{/* CONTROLES DE FILTRO */}
				<div className="bg-white rounded-[3.5rem] p-4 shadow-xl shadow-slate-200/50 border border-white flex flex-col md:flex-row gap-5 items-center mb-10">
					{/* Tabs Activo/Inactivo */}
					<div className="bg-slate-100 p-2 rounded-[2.5rem] flex gap-2 w-full md:w-auto">
						{(["activo", "inactivo"] as const).map((tab) => (
							<button
								key={tab}
								onClick={() => {
									setStatusTab(tab);
									setPage(1);
								}}
								className={`flex-1 md:flex-none px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all ${statusTab === tab ? "bg-white text-slate-900 shadow-lg scale-105" : "text-slate-400 hover:text-slate-600"}`}
							>
								{tab}s
							</button>
						))}
					</div>
					{/* Buscador por Nombre */}
					<div className="relative flex-1 w-full">
						<input
							type="text"
							placeholder="BUSCAR POR NOMBRE..."
							value={nameFilter}
							onChange={(e) => setNameFilter(e.target.value)}
							className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[2.2rem] px-10 py-5 font-bold text-xs tracking-widest uppercase outline-none transition-all"
						/>
						<span className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 text-xl">
							🔍
						</span>
					</div>
				</div>

				{/* LISTADO DE TARJETAS */}
				<div className="grid grid-cols-1 gap-6">
					{loading ? (
						[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-40 bg-white/60 animate-pulse rounded-[3rem] border border-white"
							></div>
						))
					) : users.length > 0 ? (
						users.map((user) => (
							<div
								key={user.idusuario}
								onClick={() =>
									router.push(`/dashboard/usuarios/${user.uuidusuario}`)
								}
								className="group bg-white p-8 rounded-[3rem] border border-white shadow-sm hover:shadow-2xl hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-8 relative overflow-hidden"
							>
								{/* Avatar */}
								<div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 overflow-hidden flex-shrink-0 border-4 border-white shadow-md transition-transform group-hover:rotate-3">
									{user.fotoperfil ? (
										<img
											src={getAvatarUrl(user.fotoperfil)!}
											className="w-full h-full object-cover"
											alt=""
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-white font-black text-2xl uppercase">
											{user.nombre.charAt(0)}
											{user.apellido1.charAt(0)}
										</div>
									)}
								</div>

								{/* Info del Usuario */}
								<div className="flex-1 space-y-4">
									<div>
										<h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
											{user.nombre} {user.apellido1} {user.apellido2}
										</h3>
										<p className="text-slate-400 font-bold text-[10px] tracking-widest uppercase mt-2 opacity-80 italic">
											{user.correoinstitucional}
										</p>
									</div>

									{/* Roles y Recursos */}
									<div className="flex flex-wrap items-center gap-3 opacity-60 group-hover:opacity-100 transition-all">
										<div className="flex flex-wrap gap-2">
											{user.roles?.map((r) => (
												<RoleTag key={r.id} name={r.nombre} />
											))}
										</div>

										{/* Contadores de infraestructura */}
										<div className="flex gap-4 ml-2 border-l-2 pl-5 border-slate-100">
											<div className="flex flex-col">
												<span className="text-[10px] font-black text-slate-900 leading-none">
													{user.maquinas_propiedad?.length || 0}
												</span>
												<span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
													Máquinas
												</span>
											</div>
											<div className="flex flex-col">
												<span className="text-[10px] font-black text-slate-900 leading-none">
													{user.puertas?.length || 0}
												</span>
												<span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
													Accesos
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Estado y ID */}
								<div className="hidden md:flex flex-col items-end gap-3 px-10 border-r-2 border-slate-50">
									<div
										className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${user.activo ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}
									>
										{user.activo ? "● Activo" : "○ Suspendido"}
									</div>
									<div className="flex items-center gap-3">
										<span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
											ID: {user.idusuario}
										</span>
										{user.esresponsable && (
											<div
												className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
												title="Responsable"
											></div>
										)}
									</div>
								</div>

								{/* Flecha de Navegación */}
								<div className="h-16 w-16 bg-slate-50 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner group-hover:rotate-45">
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
							No se encontraron usuarios
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
						<div className="bg-white px-10 py-4 rounded-2xl shadow-sm border border-slate-100 font-black text-slate-900 tracking-widest">
							{page} <span className="text-slate-200 mx-2">/</span> {totalPages}
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
