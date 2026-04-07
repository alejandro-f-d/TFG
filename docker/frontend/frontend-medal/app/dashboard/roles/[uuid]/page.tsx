"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

interface PermisoGlobal {
	idpermiso: number;
	alias: string;
	nombre: string;
	modulo: string;
}

interface Maquina {
	idmaquina: number;
	nombre: string;
	uuidmaquina: string;
}

interface RoleDetail {
	idrole: number;
	uuidrole: string;
	nombre: string;
	descripcion: string | null;
	usuarios: any[];
	permisos: { idPermiso: number; alias: string; nombre: string }[];
}

export default function RoleDetailPage() {
	const { uuid } = useParams();
	const router = useRouter();

	const [role, setRole] = useState<RoleDetail | null>(null);
	const [allPerms, setAllPerms] = useState<PermisoGlobal[]>([]);
	const [maquinas, setMaquinas] = useState<Maquina[]>([]);
	const [loading, setLoading] = useState(true);
	const [isManagingMatrix, setIsManagingMatrix] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

	const [searchTermMatrix, setSearchTermMatrix] = useState("");
	const [userPerms, setUserPerms] = useState<string[]>([]);

	// --- TRADUCTOR DE ALIAS ---
	const formatAlias = useCallback(
		(alias: string) => {
			// Detectamos si el alias sigue el patrón maquina:accion:uuid
			const parts = alias.split(":");
			if (parts.length === 3 && parts[0] === "maquina") {
				const uuidMaquina = parts[2];
				const encontrada = maquinas.find((m) => m.uuidmaquina === uuidMaquina);
				if (encontrada) {
					return `${parts[0]}:${parts[1]}:${encontrada.nombre.toLowerCase()}`;
				}
			}
			return alias;
		},
		[maquinas],
	);

	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				setUserPerms(parsed);
				const canAccess =
					parsed.includes("admin:total") || parsed.includes("roles:getRoles");
				if (!canAccess) router.push("/dashboard");
			} catch (e) {
				logout();
			}
		} else {
			logout();
		}
	}, [router]);

	const isAdmin = userPerms.includes("admin:total");
	const canEdit = isAdmin || userPerms.includes("roles:postRoles");
	const canDelete = isAdmin || userPerms.includes("roles:deleteRol");

	const fetchRoleDetail = useCallback(async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/rol/${uuid}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (res.status === 401) logout();
			const data = await res.json();
			if (res.ok) {
				setRole(data.info);
				setSelectedPerms(data.info.permisos.map((p: any) => p.idPermiso));
			}
		} catch (e) {
			console.error(e);
		}
	}, [uuid]);

	const fetchAllPermissions = useCallback(async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/permisos`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const data = await res.json();
			if (res.ok) {
				const perms = data.perms || [];
				setAllPerms(
					isAdmin ? perms : perms.filter((p: any) => p.alias !== "admin:total"),
				);
			}
		} catch (e) {
			console.error(e);
		}
	}, [isAdmin]);

	const fetchMaquinas = useCallback(async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const data = await res.json();
			if (res.ok) {
				setMaquinas(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			console.error("Error cargando máquinas para traducción:", e);
		}
	}, []);

	useEffect(() => {
		const loadInitialData = async () => {
			setLoading(true);
			// Cargamos máquinas primero para que la traducción esté lista al mostrar los permisos
			await Promise.all([
				fetchRoleDetail(),
				fetchAllPermissions(),
				fetchMaquinas(),
			]);
			setLoading(false);
		};
		loadInitialData();
	}, [fetchRoleDetail, fetchAllPermissions, fetchMaquinas]);

	const filteredPerms = useMemo(() => {
		return allPerms.filter(
			(p) =>
				p.alias.toLowerCase().includes(searchTermMatrix.toLowerCase()) ||
				p.modulo.toLowerCase().includes(searchTermMatrix.toLowerCase()),
		);
	}, [allPerms, searchTermMatrix]);

	const togglePermission = (perm: PermisoGlobal) => {
		if (!canEdit) return;
		if (perm.alias === "null:null") return;
		setSelectedPerms((prev) =>
			prev.includes(perm.idpermiso)
				? prev.filter((id) => id !== perm.idpermiso)
				: [...prev, perm.idpermiso],
		);
	};

	const saveMatrix = async () => {
		if (!canEdit) return;
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const idNull = allPerms.find((p) => p.alias === "null:null")?.idpermiso;
			const finalPerms =
				idNull && !selectedPerms.includes(idNull)
					? [...selectedPerms, idNull]
					: selectedPerms;
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/rol/${uuid}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ permisos: finalPerms }),
				},
			);
			if (res.ok) {
				setIsManagingMatrix(false);
				await fetchRoleDetail();
			}
		} catch (e) {
			alert("Error al actualizar la matriz");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteRole = async () => {
		if (!canDelete) return;
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/rol/${uuid}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (res.ok) router.push("/dashboard/roles");
		} catch (e) {
			alert("Error al eliminar el rol");
		} finally {
			setLoading(false);
		}
	};

	if (loading && !role)
		return (
			<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-black uppercase text-slate-300 text-[10px] tracking-[0.5em] animate-pulse">
				Sincronizando Capacidades...
			</div>
		);
	if (!role) return null;

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
					<div className="space-y-4">
						<button
							onClick={() => router.push("/dashboard/roles")}
							className="text-[10px] font-black text-slate-400 uppercase tracking-widest block hover:text-blue-600 transition-colors"
						>
							← Matriz de Roles
						</button>
						<h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							{role.nombre}
						</h1>
					</div>
					<div className="flex gap-4 w-full md:w-auto">
						{canDelete && (
							<button
								onClick={() => setIsDeleting(true)}
								className="bg-white border-2 border-red-50 text-red-500 px-8 py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase hover:bg-red-50 transition-all shadow-sm"
							>
								Borrar Rol
							</button>
						)}
						{canEdit ? (
							<button
								onClick={() => setIsManagingMatrix(true)}
								className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-blue-600 transition-all"
							>
								Gestionar Matriz
							</button>
						) : (
							<button
								disabled
								className="bg-slate-100 text-slate-300 px-10 py-5 rounded-[2rem] font-black text-[10px] tracking-widest uppercase border border-slate-200 cursor-not-allowed flex items-center gap-2"
							>
								🔒 Lectura de Perfil
							</button>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
					<div className="bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
						<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 border-b pb-4 border-slate-50">
							Descripción del Rol
						</h2>
						<p className="text-sm font-bold text-slate-600 italic leading-relaxed">
							{role.descripcion || "Este rol no posee descripción operativa."}
						</p>
					</div>

					<div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
						<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-10">
							Capacidades Activas
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{role.permisos.map((p) => (
								<div
									key={p.idPermiso}
									className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-blue-100 transition-all"
								>
									<div className="flex items-center gap-4 overflow-hidden">
										<div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
											#
										</div>
										<span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
											{formatAlias(p.alias)}
										</span>
									</div>
									{p.alias === "null:null" && (
										<span className="text-[7px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase ml-2 flex-shrink-0">
											Vital
										</span>
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* MODAL GESTIÓN MATRIZ */}
				{isManagingMatrix && canEdit && (
					<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
						<div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-b-[12px] border-blue-600">
							<div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
								<div>
									<h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
										Editor de <span className="text-blue-600">Capacidades</span>
									</h2>
									<p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">
										{isAdmin
											? "Acceso Total Administrador"
											: "Modificando permisos de rol"}
									</p>
								</div>

								<div className="flex items-center gap-4 w-full md:w-auto">
									<div className="relative flex-1 md:w-64">
										<input
											type="text"
											placeholder="BUSCAR CAPACIDAD..."
											value={searchTermMatrix}
											onChange={(e) => setSearchTermMatrix(e.target.value)}
											className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-5 pr-12 text-[10px] font-black text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-600 transition-all outline-none uppercase tracking-widest"
										/>
									</div>
									<div className="text-right hidden md:block">
										<p className="text-2xl font-black text-blue-600 leading-none">
											{selectedPerms.length}
										</p>
										<p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
											Asignados
										</p>
									</div>
								</div>
							</div>

							<div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
								{filteredPerms.length > 0 ? (
									filteredPerms.map((p) => {
										const isSelected = selectedPerms.includes(p.idpermiso);
										const isRequired = p.alias === "null:null";
										return (
											<div
												key={p.idpermiso}
												onClick={() => togglePermission(p)}
												className={`p-5 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 ${isRequired ? "bg-slate-100 opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isSelected && !isRequired ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "bg-white border-white hover:border-slate-200"}`}
											>
												<div
													className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isSelected && !isRequired ? "bg-white text-blue-600" : "bg-slate-100 text-slate-400"}`}
												>
													{isRequired ? "🔒" : isSelected ? "✓" : "+"}
												</div>
												<div className="flex flex-col overflow-hidden">
													<span
														className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected && !isRequired ? "text-white" : "text-slate-900"}`}
													>
														{formatAlias(p.alias)}
													</span>
													<span
														className={`text-[8px] font-bold uppercase ${isSelected && !isRequired ? "text-blue-100" : "text-slate-400"}`}
													>
														{p.modulo}
													</span>
												</div>
											</div>
										);
									})
								) : (
									<div className="col-span-full py-20 text-center">
										<p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
											No hay capacidades coincidentes
										</p>
									</div>
								)}
							</div>

							<div className="p-10 bg-white border-t border-slate-50 flex gap-4">
								<button
									onClick={saveMatrix}
									className="flex-1 bg-slate-900 text-white py-5 rounded-[1.8rem] font-black text-[10px] tracking-widest uppercase hover:bg-blue-600 transition-all shadow-lg"
								>
									Aplicar Cambios
								</button>
								<button
									onClick={() => setIsManagingMatrix(false)}
									className="px-10 bg-slate-100 text-slate-400 py-5 rounded-[1.8rem] font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all"
								>
									Cancelar
								</button>
							</div>
						</div>
					</div>
				)}

				{/* MODAL ELIMINAR */}
				{isDeleting && canDelete && (
					<div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
						<div className="bg-white rounded-[4rem] p-12 max-w-lg w-full text-center shadow-2xl border-b-[12px] border-red-600">
							<div className="text-6xl mb-6">🗑️</div>
							<h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">
								Confirmar Destrucción
							</h2>
							<p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-10 leading-relaxed">
								El rol <span className="text-red-600">{role.nombre}</span> será
								eliminado definitivamente.
							</p>
							<div className="flex flex-col gap-3">
								<button
									onClick={handleDeleteRole}
									className="bg-red-600 text-white py-5 rounded-3xl font-black text-[10px] tracking-widest uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-100"
								>
									Eliminar Definitivamente
								</button>
								<button
									onClick={() => setIsDeleting(false)}
									className="text-slate-400 font-black text-[9px] uppercase tracking-widest py-4 hover:text-slate-600"
								>
									No, conservar rol
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
