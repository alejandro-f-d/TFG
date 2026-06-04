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

	const formatAlias = (alias: string) => {
		if (alias.startsWith("maquina:")) {
			const parts = alias.split(":");
			if (parts.length === 3) {
				const accion = parts[1].toUpperCase();
				const objeto = parts[2].toUpperCase();
				return `${accion} (${objeto})`;
			}
		}
		return alias.replace(":", ": ").toUpperCase();
	};

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
				// Filtramos admin:total si el usuario actual no es admin
				const filtered = data.perms.filter((p: Permiso) => {
					if (p.alias === "admin:total") return isAdmin;
					return true;
				});
				setAllPerms(filtered);

				// Auto-seleccionar el permiso nulo si existe
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
				p.modulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
				p.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
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
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6 font-sans">
			<div className="max-w-6xl mx-auto">
				<div className="mb-8">
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
					{/* DATOS DEL ROL */}
					<div className="space-y-6">
						<div className="bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 border-b pb-4 border-slate-50">
								Configuración
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
										className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
										placeholder="Ej: Auditor"
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
										className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm font-bold text-slate-600 h-32 resize-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
										placeholder="Funciones del rol..."
									/>
								</div>
							</div>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-xs tracking-[0.3em] uppercase hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50"
						>
							{loading ? "Creando..." : "Guardar Rol"}
						</button>
					</div>

					{/* LISTADO DE PERMISOS */}
					<div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-white shadow-xl shadow-slate-200/50">
						<div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
								Permisos del Sistema
							</h2>
							<input
								type="text"
								placeholder="BUSCAR POR NOMBRE O MÁQUINA..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full md:w-64 bg-slate-50 border-none rounded-2xl py-3 px-6 text-[10px] font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase tracking-widest"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
							{filteredPerms.map((p) => {
								const isSelected = selectedPerms.includes(p.idpermiso);
								const isNull = p.alias === "null:null";
								return (
									<div
										key={p.idpermiso}
										onClick={() => togglePermission(p.idpermiso, p.alias)}
										className={`p-5 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 group cursor-pointer ${
											isNull
												? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-100"
												: isSelected
													? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200"
													: "bg-white border-slate-50 hover:border-blue-200"
										}`}
									>
										<div
											className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${isSelected ? "bg-white text-blue-600" : "bg-slate-100 text-slate-400"}`}
										>
											{isNull ? "🔒" : isSelected ? "✓" : "+"}
										</div>
										<div className="flex flex-col">
											<span
												className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-900"}`}
											>
												{formatAlias(p.alias)}
											</span>
											<span
												className={`text-[8px] font-bold uppercase ${isSelected ? "text-blue-100" : "text-slate-400"}`}
											>
												{p.modulo}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
