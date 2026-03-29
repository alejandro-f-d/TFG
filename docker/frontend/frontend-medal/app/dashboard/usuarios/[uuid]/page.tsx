"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	getEditableFields,
	getFieldConfig,
} from "@/components/config/userEditPermissions";

// --- Interfaces ---
interface Role {
	id: number;
	nombre: string;
}
interface Puerta {
	id: number;
	nombre: string;
}
interface Maquina {
	id: number;
	nombre: string;
}
interface ProyectoGitlab {
	id: number;
	nombre: string;
	uuid: string;
	activo: boolean;
}
interface Peticion {
	id: number;
	proyecto: string;
	estado: string;
}

interface User {
	idusuario: number;
	uuidusuario: string;
	nombre: string;
	apellido1: string;
	apellido2: string;
	correoinstitucional: string;
	activo: boolean;
	esresponsable: boolean;
	teams: boolean;
	wifi: boolean;
	usuariovpn?: string;
	gitlab?: string;
	tarjetaacceso?: string;
	diriplastlogin?: string;
	fechaincorporacion: string;
	fechafin?: string | null;
	responsable?: number | null;
	roles: Role[];
	puertas: Puerta[];
	maquinas_propiedad: Maquina[];
	proyectos_gitlab: ProyectoGitlab[];
	peticiones: Peticion[];
	fotoperfil?: any;
}

// --- Helpers Visuales ---
const getAvatarUrl = (fotoperfil: any): string | null => {
	if (!fotoperfil) return null;
	if (typeof fotoperfil === "string") return fotoperfil;
	if (fotoperfil?.type === "Buffer" && Array.isArray(fotoperfil.data)) {
		try {
			const uint8 = new Uint8Array(fotoperfil.data);
			let binary = "";
			for (let i = 0; i < uint8.length; i++)
				binary += String.fromCharCode(uint8[i]);
			return `data:image/png;base64,${btoa(binary)}`;
		} catch (e) {
			return null;
		}
	}
	return null;
};

const getRoleStyle = (roleName: string) => {
	if (!roleName) return "bg-gray-50 text-gray-700 border-gray-200";
	const name = roleName.toLowerCase();
	if (name.includes("admin")) return "bg-red-50 text-red-700 border-red-200";
	if (name.includes("responsable"))
		return "bg-purple-50 text-purple-700 border-purple-200";
	if (name.includes("jefe") || name.includes("tecnico"))
		return "bg-amber-50 text-amber-700 border-amber-200";
	return "bg-blue-50 text-blue-700 border-blue-200";
};

export default function UserDetailPage() {
	const params = useParams();
	const router = useRouter();
	const uuid = params.uuid as string;

	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editableFields, setEditableFields] = useState<string[]>([]);
	const [editForm, setEditForm] = useState<any>({});
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const [rolesList, setRolesList] = useState<Role[]>([]);
	const [puertasList, setPuertasList] = useState<Puerta[]>([]);
	const [maquinasList, setMaquinasList] = useState<Maquina[]>([]);
	const [responsablesList, setResponsablesList] = useState<any[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) return router.push("/auth/signin");

				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
				const currentUuid = localStorage.getItem("uuidUser");
				const permisosRaw = localStorage.getItem("permisos");
				const userPermissions = permisosRaw ? JSON.parse(permisosRaw) : [];

				const userRes = await fetch(`${apiUrl}/api/user/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!userRes.ok) throw new Error("Usuario no encontrado");
				const userData = await userRes.json();

				let info: User | undefined;
				if (Array.isArray(userData.info)) {
					info =
						userData.info.find((u: any) => u.uuidusuario === uuid) ||
						userData.info[0];
				} else {
					info = userData.info;
				}

				if (!info)
					throw new Error("No se pudo procesar la información del usuario");

				// Asegurar arrays
				info.roles = info.roles || [];
				info.puertas = info.puertas || [];
				info.maquinas_propiedad = info.maquinas_propiedad || [];

				setUser(info);
				setEditForm(info);
				setAvatarPreview(getAvatarUrl(info.fotoperfil));

				const isOwnProfile = currentUuid === uuid;
				setEditableFields(getEditableFields(userPermissions, isOwnProfile));

				if (
					userPermissions.includes("admin:total") ||
					userPermissions.includes("usr:editUsuario")
				) {
					const [rRes, pRes, mRes, uRes] = await Promise.all([
						fetch(`${apiUrl}/api/rol?limit=1000`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
						fetch(`${apiUrl}/api/puertas`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
						fetch(`${apiUrl}/api/maquina?limit=1000`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
						fetch(`${apiUrl}/api/user?limit=1000`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
					]);

					if (rRes.ok) {
						const d = await rRes.json();
						// Estructura: { info: { rows: [...] } } o { rows: [...] } o array directo
						let rows = [];
						if (d.info?.rows) rows = d.info.rows;
						else if (d.rows) rows = d.rows;
						else if (Array.isArray(d)) rows = d;
						else if (Array.isArray(d.info)) rows = d.info;
						setRolesList(
							rows.map((r: any) => ({
								id: r.idrole || r.id,
								nombre: r.nombre,
							})),
						);
					}
					if (pRes.ok) {
						const d = await pRes.json();
						let rows = [];
						if (d.info?.rows) rows = d.info.rows;
						else if (Array.isArray(d.info)) rows = d.info;
						else if (Array.isArray(d)) rows = d;
						setPuertasList(
							rows.map((p: any) => ({
								id: p.idpuerta || p.id,
								nombre: p.nombre,
							})),
						);
					}
					if (mRes.ok) {
						const d = await mRes.json();
						let rows = [];
						// La respuesta puede ser un array directamente o { info: [...] }
						if (Array.isArray(d)) rows = d;
						else if (d.info?.rows) rows = d.info.rows;
						else if (Array.isArray(d.info)) rows = d.info;
						setMaquinasList(
							rows.map((m: any) => ({
								id: m.idmaquina || m.id,
								nombre: m.nombre,
							})),
						);
					}
					if (uRes.ok) {
						const d = await uRes.json();
						let rows = [];
						if (d.info?.rows) rows = d.info.rows;
						else if (Array.isArray(d.info)) rows = d.info;
						else if (Array.isArray(d)) rows = d;
						setResponsablesList(
							rows.filter((r: any) => r.uuidusuario !== uuid),
						);
					}
				}
			} catch (err: any) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [uuid, router]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
			const formData = new FormData();

			editableFields.forEach((field) => {
				if (field === "fotoPerfil") return;
				let value = editForm[field];
				if (value === "" || value === null || value === undefined) return;

				let backendKey = field;
				if (field === "puertas") backendKey = "puertasAutorizadas";
				if (field === "maquinas_propiedad") backendKey = "duenoMaquina";

				if (typeof value === "boolean") {
					formData.append(backendKey, value ? "true" : "false");
				} else if (["roles", "puertas", "maquinas_propiedad"].includes(field)) {
					const ids = Array.isArray(value)
						? value.map((v) =>
								typeof v === "object" ? v.id || v.idpuerta || v.idmaquina : v,
							)
						: [];
					if (ids.length > 0) {
						formData.append(backendKey, JSON.stringify(ids));
					} else {
						// Si está vacío, enviar array vacío
						formData.append(backendKey, JSON.stringify([]));
					}
				} else {
					formData.append(backendKey, String(value));
				}
			});

			if (avatarFile) formData.append("fotoFile", avatarFile);

			const res = await fetch(`${apiUrl}/api/user/${uuid}`, {
				method: "PATCH",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (res.status === 204 || res.ok) {
				setSuccess("Usuario actualizado con éxito");
				setIsEditing(false);
				// Recargar datos sin recargar página
				const userRes = await fetch(`${apiUrl}/api/user/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (userRes.ok) {
					const userData = await userRes.json();
					let info = userData.info;
					info.roles = info.roles || [];
					info.puertas = info.puertas || [];
					info.maquinas_propiedad = info.maquinas_propiedad || [];
					setUser(info);
					setEditForm(info);
					setAvatarPreview(getAvatarUrl(info.fotoperfil));
				}
			} else {
				const d = await res.json();
				throw new Error(d.error || "Error al actualizar");
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	};

	const renderField = (field: string, value: any) => {
		const config = getFieldConfig(field);

		if (isEditing && editableFields.includes(field)) {
			if (config?.inputType === "checkbox") {
				return (
					<input
						type="checkbox"
						checked={!!value}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.checked })
						}
						className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
					/>
				);
			}
			if (config?.inputType === "select") {
				return (
					<select
						value={value || ""}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value })
						}
						className="w-full p-2.5 border rounded-xl bg-white text-gray-900 shadow-sm outline-none"
					>
						<option value="">Sin responsable</option>
						{responsablesList.map((r) => (
							<option key={r.idusuario} value={r.idusuario}>
								{r.nombre} {r.apellido1}
							</option>
						))}
					</select>
				);
			}
			if (["roles", "puertas", "maquinas_propiedad"].includes(field)) {
				const options =
					field === "roles"
						? rolesList
						: field === "puertas"
							? puertasList
							: maquinasList;
				const selectedIds = Array.isArray(value)
					? value.map((v) => (typeof v === "object" ? v.id : v))
					: [];
				return (
					<div className="grid grid-cols-1 gap-1.5 p-3 border rounded-xl bg-slate-50 max-h-48 overflow-y-auto shadow-inner">
						{options.length === 0 ? (
							<p className="text-sm text-gray-500 text-center py-2">
								Cargando opciones...
							</p>
						) : (
							options.map((opt) => (
								<label
									key={opt.id}
									className="flex items-center space-x-3 text-sm p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all cursor-pointer"
								>
									<input
										type="checkbox"
										checked={selectedIds.includes(opt.id)}
										onChange={(e) => {
											const newIds = e.target.checked
												? [...selectedIds, opt.id]
												: selectedIds.filter((id) => id !== opt.id);
											setEditForm({ ...editForm, [field]: newIds });
										}}
										className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
									/>
									<span className="text-slate-700 font-medium">
										{opt.nombre}
									</span>
								</label>
							))
						)}
					</div>
				);
			}
			if (config?.inputType === "date") {
				return (
					<input
						type="date"
						value={value ? value.split("T")[0] : ""}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value })
						}
						className="w-full p-2.5 border rounded-xl bg-white text-gray-900 shadow-sm outline-none"
					/>
				);
			}
			return (
				<input
					type="text"
					value={value ?? ""}
					onChange={(e) =>
						setEditForm({ ...editForm, [field]: e.target.value })
					}
					className="w-full p-2.5 border rounded-xl bg-white text-gray-900 shadow-sm outline-none"
				/>
			);
		}

		// Modo visualización
		if (field === "roles") {
			return (
				<div className="flex flex-wrap gap-2">
					{value && value.length > 0 ? (
						value.map((v: Role) => (
							<span
								key={v.id}
								className={`px-3 py-1 rounded-lg text-[10px] font-black border ${getRoleStyle(v.nombre)} uppercase tracking-wider`}
							>
								{v.nombre}
							</span>
						))
					) : (
						<span className="text-slate-400 text-xs italic">
							Sin roles asignados
						</span>
					)}
				</div>
			);
		}

		if (field === "puertas") {
			return (
				<div className="flex flex-wrap gap-1.5">
					{value && value.length > 0 ? (
						value.map((v: Puerta) => (
							<span
								key={v.id}
								className="bg-white text-slate-600 px-3 py-1 rounded-md text-[11px] font-bold border border-slate-200 shadow-sm"
							>
								{v.nombre}
							</span>
						))
					) : (
						<span className="text-slate-400 text-xs italic">
							Sin puertas asignadas
						</span>
					)}
				</div>
			);
		}

		if (field === "maquinas_propiedad") {
			return (
				<div className="flex flex-wrap gap-1.5">
					{value && value.length > 0 ? (
						value.map((v: Maquina) => (
							<span
								key={v.id}
								className="bg-white text-slate-600 px-3 py-1 rounded-md text-[11px] font-bold border border-slate-200 shadow-sm"
							>
								{v.nombre}
							</span>
						))
					) : (
						<span className="text-slate-400 text-xs italic">
							Sin máquinas asignadas
						</span>
					)}
				</div>
			);
		}

		if (field === "proyectos_gitlab") {
			return (
				<div className="grid grid-cols-1 gap-2">
					{value && value.length > 0 ? (
						value.map((p: ProyectoGitlab) => (
							<div
								key={p.uuid}
								className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
							>
								<span className="text-sm font-bold text-slate-700">
									{p.nombre}
								</span>
								<span
									className={`text-[10px] px-2 py-0.5 rounded-full font-black ${p.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
								>
									{p.activo ? "ACTIVO" : "INACTIVO"}
								</span>
							</div>
						))
					) : (
						<span className="text-slate-400 text-xs italic">
							No participa en proyectos
						</span>
					)}
				</div>
			);
		}

		if (typeof value === "boolean") {
			return (
				<span
					className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
				>
					{value ? "SÍ" : "NO"}
				</span>
			);
		}

		if (field === "fechafin" && !value) {
			return <span className="text-slate-400 text-xs italic">Sin fecha</span>;
		}

		return <span className="text-slate-800 font-bold">{value || "-"}</span>;
	};

	const sections = [
		{
			title: "Información Personal",
			fields: [
				{ field: "nombre", label: "Nombre" },
				{ field: "apellido1", label: "Primer Apellido" },
				{ field: "apellido2", label: "Segundo Apellido" },
				{ field: "correoinstitucional", label: "Correo Electrónico" },
			],
		},
		{
			title: "Identidad Digital",
			fields: [
				{ field: "usuariovpn", label: "Usuario VPN" },
				{ field: "gitlab", label: "Handle GitLab" },
				{ field: "tarjetaacceso", label: "Nº Tarjeta Física" },
				{ field: "diriplastlogin", label: "Última IP Conocida" },
			],
		},
		{
			title: "Laboral y Estado",
			fields: [
				{ field: "fechaincorporacion", label: "Fecha Alta" },
				{ field: "fechafin", label: "Fecha Baja" },
				{ field: "activo", label: "Estado de Cuenta" },
				{ field: "responsable", label: "ID Responsable" },
			],
		},
		{
			title: "Permisos y Accesos",
			fields: [
				{ field: "roles", label: "Roles Asignados" },
				{ field: "puertas", label: "Acceso a Espacios" },
				{ field: "maquinas_propiedad", label: "Equipos Vinculados" },
				{ field: "proyectos_gitlab", label: "Proyectos en Curso" },
			],
		},
	];

	if (loading)
		return (
			<div className="flex flex-col h-screen items-center justify-center bg-slate-50 space-y-4">
				<div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
				<p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
					Sincronizando datos...
				</p>
			</div>
		);

	if (!user)
		return (
			<div className="p-20 text-center text-red-500 font-bold uppercase tracking-widest">
				⚠️ Error: Usuario no encontrado
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12">
			<div className="max-w-5xl mx-auto px-6">
				<div className="flex justify-between items-center mb-10">
					<button
						onClick={() => router.back()}
						className="group flex items-center text-slate-400 hover:text-blue-600 transition-all font-black text-xs tracking-widest"
					>
						<span className="mr-2 transition-transform group-hover:-translate-x-1">
							←
						</span>{" "}
						PANEL GENERAL
					</button>
					{!isEditing && (
						<button
							onClick={() => setIsEditing(true)}
							className="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 font-black text-xs tracking-widest flex items-center gap-2"
						>
							<span>✏️</span> EDITAR PERFIL
						</button>
					)}
				</div>

				<div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					<div className="relative h-64 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
						<div className="absolute -bottom-12 left-12 flex items-center space-x-10 w-[calc(100%-3rem)]">
							<div className="relative group shrink-0">
								<div className="w-48 h-48 rounded-[3rem] border-[8px] border-white overflow-hidden bg-white shadow-2xl">
									{avatarPreview ? (
										<img
											src={avatarPreview}
											className="w-full h-full object-cover"
											alt="Avatar"
										/>
									) : (
										<div className="flex h-full items-center justify-center text-7xl font-black text-slate-200 bg-slate-100">
											{user.nombre?.[0] || "?"}
										</div>
									)}
								</div>
								{isEditing && (
									<label className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[3rem] backdrop-blur-sm">
										<input
											type="file"
											className="hidden"
											accept="image/*"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													setAvatarFile(file);
													const r = new FileReader();
													r.onload = () => setAvatarPreview(r.result as string);
													r.readAsDataURL(file);
												}
											}}
										/>
										<span className="text-white font-black text-[10px] tracking-[0.2em]">
											CAMBIAR
										</span>
									</label>
								)}
							</div>

							<div className="flex flex-col mb-2">
								<h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-xl mb-3">
									{user.nombre} {user.apellido1}
								</h1>
								<div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full w-fit border border-white/10">
									<span
										className={`w-2.5 h-2.5 rounded-full ${user.activo ? "bg-green-400" : "bg-red-400"} shadow-[0_0_12px_rgba(74,222,128,0.5)]`}
									></span>
									<p className="text-blue-100/90 font-black text-[10px] tracking-[0.15em] uppercase">
										{user.correoinstitucional}
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="h-24"></div>

					<div className="px-16 pb-16 pt-4">
						{error && (
							<div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl mb-10 flex items-center gap-3 font-black text-xs tracking-wide uppercase">
								<span>⚠️</span> {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-4 rounded-2xl mb-10 flex items-center gap-3 font-black text-xs tracking-wide uppercase">
								<span>✅</span> {success}
							</div>
						)}

						<form onSubmit={handleSave} className="space-y-20">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-16">
								{sections.map((section) => (
									<div key={section.title}>
										<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
											<span className="w-10 h-[2px] bg-blue-600"></span>
											{section.title}
										</h3>
										<div className="space-y-10">
											{section.fields.map((f) => (
												<div
													key={f.field}
													className="flex flex-col space-y-2.5 border-l-2 border-slate-50 pl-8 hover:border-blue-100 transition-colors group/field"
												>
													<label className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] group-hover/field:text-blue-400 transition-colors">
														{f.label}
													</label>
													<div className="min-h-[24px]">
														{renderField(f.field, editForm[f.field])}
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>

							{isEditing && (
								<div className="flex gap-6 pt-16 border-t border-slate-100">
									<button
										type="submit"
										disabled={saving}
										className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all disabled:opacity-50 hover:-translate-y-1 active:translate-y-0 tracking-[0.2em] text-xs"
									>
										{saving
											? "PROCESANDO ACTUALIZACIÓN..."
											: "CONFIRMAR CAMBIOS"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											setEditForm(user);
											setAvatarPreview(getAvatarUrl(user.fotoperfil));
										}}
										className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[2rem] font-black hover:bg-slate-200 transition-all text-xs tracking-[0.2em]"
									>
										CANCELAR
									</button>
								</div>
							)}
						</form>
					</div>
				</div>

				<div className="mt-12 text-center opacity-30">
					<p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">
						System ID: {user.uuidusuario} • Secure Connection Active
					</p>
				</div>
			</div>
		</div>
	);
}
