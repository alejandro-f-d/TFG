"use client";

import { useState, useEffect, useCallback } from "react";
import { logout } from "@/lib/auth-common";

interface Permission {
	idpermiso: number;
	alias: string;
	nombre: string;
	descripcion: string;
	modulo: string;
}

export default function PermissionsPage() {
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	const fetchPermissions = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/permisos`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			if (res.status === 401) logout();

			const data = await res.json();
			if (res.ok) {
				setPermissions(data.perms || []);
			}
		} catch (error) {
			console.error("Error cargando permisos:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPermissions();
	}, [fetchPermissions]);

	// Filtro local (ya que esta API devuelve la lista completa sin paginar)
	const filteredPermissions = permissions.filter(
		(p) =>
			p.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
			p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
			p.modulo.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	// Agrupar por módulos para una mejor visualización
	const modules = Array.from(new Set(permissions.map((p) => p.modulo)));

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
					<div>
						<h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Matriz de <span className="text-blue-600">Permisos</span>
						</h1>
						<p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase mt-3">
							Definición de capacidades del sistema
						</p>
					</div>
					<div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
						<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
							Total:
						</span>
						<span className="text-xl font-black text-blue-600">
							{permissions.length}
						</span>
					</div>
				</div>

				{/* BUSCADOR */}
				<div className="bg-white rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/40 border border-white mb-10 flex items-center">
					<div className="w-14 h-14 flex items-center justify-center text-xl grayscale opacity-30">
						🔑
					</div>
					<input
						type="text"
						placeholder="FILTRAR POR ALIAS, NOMBRE O MÓDULO..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="flex-1 bg-transparent border-none focus:ring-0 px-4 font-bold text-xs tracking-widest uppercase outline-none"
					/>
				</div>

				{/* LISTADO TIPO GRID */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{loading ? (
						[1, 2, 3, 4, 5, 6].map((i) => (
							<div
								key={i}
								className="h-44 bg-white/60 animate-pulse rounded-[2rem] border border-white"
							></div>
						))
					) : filteredPermissions.length > 0 ? (
						filteredPermissions.map((perm) => (
							<div
								key={perm.idpermiso}
								className="group bg-white p-6 rounded-[2.2rem] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
							>
								{/* Decoración de fondo (Módulo) */}
								<span className="absolute -right-4 -top-2 text-slate-50 font-black text-4xl uppercase select-none pointer-events-none group-hover:text-slate-100 transition-colors">
									{perm.modulo !== "null" ? perm.modulo : ""}
								</span>

								<div className="relative z-10">
									<div className="flex justify-between items-start mb-4">
										<span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg group-hover:bg-blue-600 transition-colors">
											ID: {perm.idpermiso}
										</span>
										{perm.modulo !== "null" && (
											<span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
												Mod: {perm.modulo}
											</span>
										)}
									</div>

									<h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">
										{perm.alias !== "null:null" ? perm.alias : "Sin Alias"}
									</h3>
									<p className="text-slate-400 font-bold text-[9px] uppercase tracking-wide mb-3">
										{perm.nombre !== "null"
											? perm.nombre
											: "Nombre no definido"}
									</p>
								</div>

								<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-auto">
									<p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
										{perm.descripcion !== "null"
											? `"${perm.descripcion}"`
											: "No existe una descripción técnica para este permiso."}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="col-span-full bg-white rounded-[3rem] p-20 text-center border-4 border-dashed border-slate-100">
							<p className="text-slate-300 font-black text-xs uppercase tracking-[0.4em]">
								No hay coincidencias en el registro
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
