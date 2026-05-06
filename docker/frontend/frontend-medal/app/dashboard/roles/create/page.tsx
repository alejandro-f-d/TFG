"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import BackButton from "@/components/backButton/BackButton";

interface Permiso {
	idpermiso: number;
	alias: string;
	nombre: string;
	modulo: string;
}

export default function CreateRolePage() {
	const router = useRouter();

	const [nombre, setNombre] = useState("");
	const [descripcion, setDescripcion] = useState("");
	const [selectedPerms, setSelectedPerms] = useState<number[]>([]);

	const [allPerms, setAllPerms] = useState<Permiso[]>([]);
	const [loading, setLoading] = useState(false);
	const [userPerms, setUserPerms] = useState<string[]>([]);

	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);
			const canCreate =
				parsed.includes("admin:total") || parsed.includes("roles:postRoles");
			if (!canCreate) router.push("/dashboard/roles");
		} else {
			logout();
		}
	}, [router]);

	const fetchPermissions = useCallback(async () => {
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
				const isAdmin = userPerms.includes("admin:total");
				const filtered = data.perms.filter((p: Permiso) => {
					if (p.alias === "admin:total") return isAdmin;
					return true;
				});
				setAllPerms(filtered);

				const nullPerm = filtered.find((p: Permiso) => p.alias === "null:null");
				if (nullPerm) setSelectedPerms([nullPerm.idpermiso]);
			}
		} catch (e) {
			console.error(e);
		}
	}, [userPerms]);

	useEffect(() => {
		if (userPerms.length > 0) fetchPermissions();
	}, [userPerms, fetchPermissions]);

	const filteredPerms = useMemo(() => {
		return allPerms.filter(
			(p) =>
				p.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
				p.modulo.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [allPerms, searchTerm]);

	const togglePermission = (id: number, alias: string) => {
		if (alias === "null:null") return;
		setSelectedPerms((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nombre) return alert("El nombre del rol es obligatorio");

		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rol`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ nombre, descripcion, permisos: selectedPerms }),
			});
			const data = await res.json();
			if (res.ok) router.push(`/dashboard/roles/${data.uuid}`);
			else alert(data.error || "Error al crear el rol");
		} catch (error) {
			alert("Error de conexión");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<div className="mb-6">
					<BackButton />
				</div>

				<div className="mb-12">
					<h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">
						Nuevo <span className="text-blue-600">Rol</span>
					</h1>
				</div>

				<form
					onSubmit={handleSubmit}
					className="grid grid-cols-1 lg:grid-cols-3 gap-10"
				>
					{/* COLUMNA IZQUIERDA: DATOS BÁSICOS */}
					<div className="space-y-6">
						<div className="bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 border-b pb-4 border-slate-50">
								Identidad del Rol
							</h2>
							<div className="space-y-8">
								<div>
									<label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">
										Nombre del Rol
									</label>
									<input
										type="text"
										value={nombre}
										onChange={(e) => setNombre(e.target.value)}
										placeholder="Ej: Becario"
										className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
										required
									/>
								</div>
								<div>
									<label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">
										Descripción
									</label>
									<textarea
										value={descripcion}
										onChange={(e) => setDescripcion(e.target.value)}
										placeholder="Breve descripción funcional..."
										className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold text-slate-600 h-32 resize-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
									/>
								</div>
							</div>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-xs tracking-[0.3em] uppercase hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50"
						>
							{loading ? "Procesando..." : "Crear Rol"}
						</button>
					</div>

					{/* COLUMNA DERECHA: MATRIZ CON BUSCADOR */}
					<div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
								Asignación de Capacidades
							</h2>

							{/* --- EL BUSCADOR --- */}
							<div className="relative w-full md:w-64 group">
								<div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
								</div>
								<input
									type="text"
									placeholder="BUSCAR PERMISO..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all outline-none uppercase tracking-widest"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
							{filteredPerms.length > 0 ? (
								filteredPerms.map((p) => {
									const isSelected = selectedPerms.includes(p.idpermiso);
									const isNull = p.alias === "null:null";
									return (
										<div
											key={p.idpermiso}
											onClick={() => togglePermission(p.idpermiso, p.alias)}
											className={`p-5 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 group ${isNull ? "bg-slate-50 border-slate-100 opacity-70 cursor-not-allowed" : isSelected ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200 cursor-pointer" : "bg-white border-slate-50 hover:border-blue-200 cursor-pointer"}`}
										>
											<div
												className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${isSelected ? "bg-white text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-400"}`}
											>
												{isNull ? "🔒" : isSelected ? "✓" : "+"}
											</div>
											<div className="flex flex-col">
												<span
													className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-900"}`}
												>
													{p.alias}
												</span>
												<span
													className={`text-[8px] font-bold uppercase ${isSelected ? "text-blue-100" : "text-slate-400"}`}
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
										No se han encontrado permisos
									</p>
								</div>
							)}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
