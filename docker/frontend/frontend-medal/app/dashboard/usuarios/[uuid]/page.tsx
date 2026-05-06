"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	getEditableFields,
	getFieldConfig,
} from "@/components/config/userEditPermissions";
import { logout } from "@/lib/auth-common";

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
	esresponsable: boolean; // Booleano de rango
	teams: boolean;
	wifi: boolean;
	usuariovpn?: string;
	gitlab?: string;
	tarjetaacceso?: string;
	diriplastlogin?: string;
	fechaincorporacion: string;
	fechafin?: string | null;
	responsable?: number | null; // ID del superior
	roles: Role[];
	puertas: Puerta[];
	maquinas_propiedad: Maquina[];
	proyectos_gitlab: ProyectoGitlab[];
	peticiones: Peticion[];
	fotoperfil?: any;
}

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
	if (!roleName) return "bg-slate-100 text-slate-700 border-slate-300";
	const name = roleName.toLowerCase();
	if (name.includes("admin")) return "bg-red-100 text-red-900 border-red-300";
	if (name.includes("responsable"))
		return "bg-purple-100 text-purple-900 border-purple-300";
	return "bg-blue-100 text-blue-900 border-blue-300";
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
	const [gitlabPassword, setGitlabPassword] = useState("");
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const [rolesList, setRolesList] = useState<Role[]>([]);
	const [puertasList, setPuertasList] = useState<Puerta[]>([]);
	const [responsablesList, setResponsablesList] = useState<any[]>([]);
	const [maquinasList, setMaquinasList] = useState<Maquina[]>([]);
	const [maquinaSearch, setMaquinaSearch] = useState("");
	const [searchingMaquinas, setSearchingMaquinas] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) return logout();

				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
				const currentUuid = localStorage.getItem("uuidUser");
				const permisosRaw = localStorage.getItem("permisos");
				const userPermissions = permisosRaw ? JSON.parse(permisosRaw) : [];

				const userRes = await fetch(`${apiUrl}/api/user/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!userRes.ok) throw new Error("Usuario no encontrado");
				const userData = await userRes.json();
				const info = Array.isArray(userData.info)
					? userData.info[0]
					: userData.info;

				const normalizedInfo = {
					...info,
					roles: info.roles || [],
					puertasAutorizadas: info.puertas || [],
					duenoMaquina: info.maquinas_propiedad || [],
				};

				setUser(info);
				setEditForm(normalizedInfo);
				setAvatarPreview(getAvatarUrl(info.fotoperfil));
				setMaquinasList(normalizedInfo.duenoMaquina);

				const isOwnProfile = currentUuid === uuid;
				setEditableFields(getEditableFields(userPermissions, isOwnProfile));

				if (
					userPermissions.includes("admin:total") ||
					userPermissions.includes("usr:editUsuario")
				) {
					const [rRes, pRes, uRes] = await Promise.all([
						fetch(`${apiUrl}/api/rol?limit=1000`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
						fetch(`${apiUrl}/api/puertas`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
						fetch(`${apiUrl}/api/user?limit=1000`, {
							headers: { Authorization: `Bearer ${token}` },
						}),
					]);

					if (rRes.ok) {
						const d = await rRes.json();
						const rows = d.info?.rows || d.rows || (Array.isArray(d) ? d : []);
						setRolesList(
							rows.map((r: any) => ({
								id: r.idrole || r.id,
								nombre: r.nombre,
							})),
						);
					}
					if (pRes.ok) {
						const d = await pRes.json();
						const rows = d.info?.rows || (Array.isArray(d.info) ? d.info : d);
						setPuertasList(
							rows.map((p: any) => ({
								id: p.idpuerta || p.id,
								nombre: p.nombre,
							})),
						);
					}
					if (uRes.ok) {
						const d = await uRes.json();
						const rows = d.info?.rows || d.info || d;
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

	useEffect(() => {
		if (!isEditing || maquinaSearch.length < 2) return;
		const delayDebounceFn = setTimeout(async () => {
			setSearchingMaquinas(true);
			try {
				const token = localStorage.getItem("token");
				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
				const res = await fetch(
					`${apiUrl}/api/maquina?search=${maquinaSearch}&limit=10`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				if (res.ok) {
					const d = await res.json();
					const rows = d.info?.rows || d.info || d || [];
					const newResults = rows.map((m: any) => ({
						id: m.idmaquina || m.id,
						nombre: m.nombre,
					}));
					const combined = [...(editForm.duenoMaquina || [])];
					newResults.forEach((nr: any) => {
						if (!combined.some((c) => (c.id || c.idmaquina) === nr.id))
							combined.push(nr);
					});
					setMaquinasList(combined);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setSearchingMaquinas(false);
			}
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [maquinaSearch, isEditing, editForm.duenoMaquina]);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
			const formData = new FormData();

			const isSetToInactive =
				user?.activo === true && editForm.activo === false;
			const queryParam = isSetToInactive ? "?darBaja=true" : "";

			editableFields.forEach((field) => {
				if (field === "fotoPerfil") return;
				let value = editForm[field];

				if (["fechafin", "responsable", "fechaincorporacion"].includes(field)) {
					if (!value || value === "" || value === "null") {
						formData.append(field, "null");
						return;
					}
				}
				if (value === undefined || value === null) return;

				if (typeof value === "boolean") {
					formData.append(field, value ? "true" : "false");
				} else if (
					["roles", "puertasAutorizadas", "duenoMaquina"].includes(field)
				) {
					const ids = Array.isArray(value)
						? value.map((v) =>
								typeof v === "object" ? v.id || v.idpuerta || v.idmaquina : v,
							)
						: [];
					formData.append(field, JSON.stringify(ids));
				} else {
					formData.append(
						field,
						field.includes("fecha")
							? String(value).split("T")[0]
							: String(value),
					);
				}
			});

			if (!user?.gitlab && editForm.gitlab && gitlabPassword) {
				formData.append("passwordGitlab", gitlabPassword);
			}

			if (avatarFile) formData.append("fotoFile", avatarFile);

			const res = await fetch(`${apiUrl}/api/user/${uuid}${queryParam}`, {
				method: "PATCH",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (res.ok || res.status === 204) {
				setSuccess(
					isSetToInactive
						? "Usuario dado de baja con éxito"
						: "Usuario actualizado con éxito",
				);
				setIsEditing(false);
				setTimeout(() => window.location.reload(), 1000);
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
		const inputBaseClass =
			"w-full p-3 border-2 border-slate-300 rounded-2xl bg-white text-sm font-bold text-slate-950 shadow-sm outline-none focus:border-blue-700 transition-all";

		if (isEditing && editableFields.includes(field)) {
			if (field === "gitlab" && !user?.gitlab) {
				return (
					<div className="space-y-4 w-full animate-in slide-in-from-top-2 duration-300">
						<div className="bg-orange-50 p-6 rounded-[2rem] border-2 border-orange-300">
							<p className="text-[9px] font-black text-orange-700 uppercase mb-4 tracking-widest">
								Crear Cuenta GitLab
							</p>
							<div className="space-y-4">
								<input
									type="text"
									placeholder="NOMBRE_USUARIO_GITLAB"
									value={value ?? ""}
									onChange={(e) =>
										setEditForm({ ...editForm, gitlab: e.target.value })
									}
									className="w-full p-3 border-2 border-orange-400 rounded-2xl bg-white text-sm font-bold text-slate-950 shadow-sm outline-none focus:border-orange-600 transition-all placeholder:text-orange-200"
								/>
								{editForm.gitlab && (
									<input
										type="password"
										placeholder="CONTRASEÑA_GITLAB"
										value={gitlabPassword}
										onChange={(e) => setGitlabPassword(e.target.value)}
										className="w-full p-3 border-2 border-orange-400 rounded-2xl bg-white text-sm font-bold text-slate-950 shadow-sm outline-none focus:border-orange-600 transition-all animate-in fade-in"
									/>
								)}
							</div>
						</div>
					</div>
				);
			}

			if (field === "wifi") {
				return (
					<label className="flex items-center space-x-3 bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
						<input
							type="checkbox"
							checked={!!value}
							onChange={(e) =>
								setEditForm({ ...editForm, [field]: e.target.checked })
							}
							className="w-6 h-6 rounded-lg text-blue-700 focus:ring-blue-600 border-slate-400"
						/>
						<span className="text-xs font-black text-slate-950 uppercase tracking-widest">
							Acceso Permitido
						</span>
					</label>
				);
			}

			if (["roles", "puertasAutorizadas", "duenoMaquina"].includes(field)) {
				const options =
					field === "roles"
						? rolesList
						: field === "puertasAutorizadas"
							? puertasList
							: maquinasList;
				const selectedIds = Array.isArray(value)
					? value.map((v: any) => v.id || v.idpuerta || v.idmaquina)
					: [];

				return (
					<div className="space-y-4 w-full">
						{field === "duenoMaquina" && (
							<div className="relative group">
								<input
									type="text"
									placeholder="Escribe el nombre de la máquina..."
									value={maquinaSearch}
									onChange={(e) => setMaquinaSearch(e.target.value)}
									className="w-full p-3 pl-11 border-2 border-slate-300 rounded-2xl bg-white text-sm font-bold text-slate-950 shadow-sm focus:border-blue-700 outline-none transition-all"
								/>
								<div className="absolute left-4 top-3.5">
									{searchingMaquinas ? (
										<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
									) : (
										<span className="text-slate-500 text-lg">🔍</span>
									)}
								</div>
							</div>
						)}
						<div className="grid grid-cols-1 gap-2 p-4 border-2 border-slate-200 rounded-[2.5rem] bg-slate-100/50 max-h-60 overflow-y-auto shadow-inner">
							{options.map((opt: any) => {
								const optId = opt.id || opt.idpuerta || opt.idmaquina;
								const isChecked = selectedIds.includes(optId);
								return (
									<label
										key={optId}
										className={`flex items-center space-x-3 p-3 rounded-2xl transition-all cursor-pointer border-2 ${isChecked ? "bg-white shadow-md border-blue-500" : "hover:bg-white/80 border-transparent"}`}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={(e) => {
												const newItems = e.target.checked
													? [...(value || []), opt]
													: value.filter(
															(v: any) =>
																(v.id || v.idpuerta || v.idmaquina) !== optId,
														);
												setEditForm({ ...editForm, [field]: newItems });
											}}
											className="w-5 h-5 rounded-lg text-blue-700 focus:ring-blue-600 border-slate-400"
										/>
										<span
											className={`text-sm font-black ${isChecked ? "text-blue-900" : "text-slate-600"}`}
										>
											{opt.nombre}
										</span>
									</label>
								);
							})}
						</div>
					</div>
				);
			}

			if (field === "activo" || field === "esresponsable") {
				return (
					<select
						value={String(value)}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value === "true" })
						}
						className={inputBaseClass}
					>
						{field === "activo" ? (
							<>
								<option value="true">ACTIVO</option>
								<option value="false">INACTIVO</option>
							</>
						) : (
							<>
								<option value="false">NO ES RESPONSABLE</option>
								<option value="true">SÍ ES RESPONSABLE</option>
							</>
						)}
					</select>
				);
			}

			if (config?.inputType === "select" && field === "responsable") {
				return (
					<select
						value={value ?? ""}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value })
						}
						className={inputBaseClass}
					>
						<option value="">Sin superior directo</option>
						{responsablesList.map((r) => (
							<option key={r.idusuario} value={r.idusuario}>
								{r.nombre} {r.apellido1}
							</option>
						))}
					</select>
				);
			}

			return (
				<input
					type={config?.inputType === "date" ? "date" : "text"}
					value={
						field.includes("fecha") && value
							? value.split("T")[0]
							: (value ?? "")
					}
					onChange={(e) =>
						setEditForm({ ...editForm, [field]: e.target.value })
					}
					className={inputBaseClass}
				/>
			);
		}

		// --- Lectura ---
		if (field === "esresponsable") {
			return (
				<span
					className={`px-4 py-1.5 rounded-xl text-[10px] font-black border-2 uppercase tracking-widest shadow-sm ${value ? "bg-purple-100 text-purple-900 border-purple-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
				>
					{value ? "👤 Responsable" : "👥 Miembro"}
				</span>
			);
		}
		if (field === "gitlab") {
			return value ? (
				<span className="bg-orange-100 text-orange-900 px-4 py-1.5 rounded-xl text-[10px] font-black border-2 border-orange-200 uppercase tracking-widest shadow-sm">
					🦊 {value}
				</span>
			) : (
				<span className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">
					Sin cuenta vinculada
				</span>
			);
		}
		if (field === "wifi") {
			return (
				<span
					className={`px-4 py-1.5 rounded-xl text-[10px] font-black border-2 uppercase tracking-widest shadow-sm ${value ? "bg-blue-100 text-blue-900 border-blue-300" : "bg-slate-100 text-slate-500 border-slate-300"}`}
				>
					{value ? "📶 WiFi Activo" : "🚫 WiFi Inactivo"}
				</span>
			);
		}
		if (["roles", "puertasAutorizadas", "duenoMaquina"].includes(field)) {
			return (
				<div className="flex flex-wrap gap-2">
					{Array.isArray(value) && value.length > 0 ? (
						value.map((v: any) => (
							<span
								key={v.id || v.idpuerta || v.idmaquina}
								className={`px-4 py-1.5 rounded-xl text-[10px] font-black border-2 uppercase tracking-widest shadow-sm ${field === "roles" ? getRoleStyle(v.nombre) : "bg-white text-slate-900 border-slate-300"}`}
							>
								{v.nombre}
							</span>
						))
					) : (
						<span className="text-slate-400 text-xs italic">Sin asignar</span>
					)}
				</div>
			);
		}
		if (typeof value === "boolean") {
			return (
				<span
					className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${value ? "bg-green-100 text-green-900 border-green-300" : "bg-red-100 text-red-900 border-red-300"}`}
				>
					{value ? "ACTIVO" : "INACTIVO"}
				</span>
			);
		}
		return <span className="text-slate-950 font-black">{value || "-"}</span>;
	};

	const sections = [
		{
			title: "Información Personal",
			fields: [
				{ field: "nombre", label: "Nombre" },
				{ field: "apellido1", label: "Primer Apellido" },
				{ field: "apellido2", label: "Segundo Apellido" },
				{ field: "correoinstitucional", label: "Correo" },
			],
		},
		{
			title: "Identidad Digital",
			fields: [
				{ field: "usuariovpn", label: "Usuario VPN" },
				{ field: "gitlab", label: "GitLab" },
				{ field: "tarjetaacceso", label: "Nº Tarjeta" },
				{ field: "wifi", label: "Acceso WiFi" },
			],
		},
		{
			title: "Laboral y Organización",
			fields: [
				{ field: "fechaincorporacion", label: "Fecha Alta" },
				{ field: "fechafin", label: "Fecha Baja" },
				{ field: "responsable", label: "Superior Directo" },
				{ field: "esresponsable", label: "¿Es Responsable?" },
				{ field: "activo", label: "Estado Cuenta" },
			],
		},
		{
			title: "Permisos y Equipos",
			fields: [
				{ field: "roles", label: "Roles" },
				{ field: "puertasAutorizadas", label: "Accesos (Puertas)" },
				{ field: "duenoMaquina", label: "Responsable de Máquinas" },
			],
		},
	];

	if (loading)
		return (
			<div className="h-screen flex items-center justify-center font-black text-slate-900 animate-pulse uppercase text-sm tracking-[0.5em]">
				Cargando perfil...
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<div className="max-w-5xl mx-auto">
				<div className="flex justify-between items-center mb-10">
					<button
						onClick={() => router.back()}
						className="text-xs font-black tracking-[0.2em] text-slate-500 hover:text-blue-700 transition-colors uppercase border-b-2 border-transparent hover:border-blue-700"
					>
						← Volver
					</button>
				</div>

				<div className="bg-white rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border-2 border-slate-200">
					<div className="relative bg-slate-950 pt-24 pb-20 px-14 flex flex-col md:flex-row items-center md:items-end gap-12">
						<div className="relative group w-52 h-52 rounded-[3.5rem] border-[10px] border-white overflow-hidden bg-slate-200 shadow-2xl shrink-0 -mb-32 z-10">
							{avatarPreview ? (
								<img
									src={avatarPreview}
									alt="Avatar"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="flex h-full items-center justify-center text-7xl font-black text-slate-400">
									{user?.nombre?.[0]}
								</div>
							)}
							{isEditing && (
								<label className="absolute inset-0 bg-blue-700/80 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer backdrop-blur-md transition-all">
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
									<span className="text-white text-[11px] font-black tracking-[0.2em] text-center px-4">
										CAMBIAR FOTO
									</span>
								</label>
							)}
						</div>
						<div className="flex-1 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-2 w-full text-center md:text-left">
							<div>
								<h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl leading-[1.1] mb-6">
									{user?.nombre} {user?.apellido1}
								</h1>
								<div className="inline-flex items-center gap-4 bg-white/20 border-2 border-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-xl shadow-lg">
									<div className="relative flex h-4 w-4">
										{user?.activo && (
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
										)}
										<span
											className={`relative inline-flex rounded-full h-4 w-4 ${user?.activo ? "bg-green-500" : "bg-red-500"}`}
										></span>
									</div>
									<p className="text-white font-black text-sm tracking-wide">
										{user?.correoinstitucional}
									</p>
								</div>
							</div>
							{!isEditing && (
								<button
									onClick={() => setIsEditing(true)}
									className="bg-white text-slate-950 px-10 py-5 rounded-3xl font-black text-[11px] tracking-[0.2em] shadow-2xl hover:bg-blue-50 active:scale-95 transition-all shrink-0 self-center md:self-end border-b-4 border-slate-200"
								>
									✏️ EDITAR PERFIL
								</button>
							)}
						</div>
					</div>

					<div className="h-40"></div>

					<div className="px-20 pb-20">
						{error && (
							<div className="bg-red-100 border-4 border-red-300 text-red-900 p-6 rounded-3xl mb-10 font-black text-xs uppercase tracking-widest flex items-center gap-4">
								<span className="text-2xl">⚠️</span> {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-100 border-4 border-emerald-300 text-emerald-900 p-6 rounded-3xl mb-10 font-black text-xs uppercase tracking-widest flex items-center gap-4">
								<span className="text-2xl">✅</span> {success}
							</div>
						)}

						<form onSubmit={handleSave} className="space-y-24">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-20">
								{sections.map((section) => (
									<div key={section.title}>
										<h3 className="text-blue-800 font-black text-[11px] uppercase tracking-[0.5em] mb-12 flex items-center gap-4">
											<span className="w-16 h-[3px] bg-blue-700"></span>
											{section.title}
										</h3>
										<div className="space-y-12">
											{section.fields.map((f) => (
												<div
													key={f.field}
													className="flex flex-col space-y-4 pl-8 border-l-4 border-slate-100 hover:border-blue-600 transition-all group"
												>
													<label className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-blue-700">
														{f.label}
													</label>
													<div className="min-h-[32px]">
														{renderField(f.field, editForm[f.field])}
													</div>
												</div>
											))}
										</div>
									</div>
								))}
								<div className="md:col-span-2 pt-10">
									<h3 className="text-slate-950 font-black text-[11px] uppercase tracking-[0.5em] mb-12 flex items-center gap-4">
										<span className="w-16 h-[3px] bg-slate-950"></span>Proyectos
										GitLab
									</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
										{user?.proyectos_gitlab?.length ? (
											user.proyectos_gitlab.map((proy) => (
												<div
													key={proy.uuid}
													onClick={() =>
														router.push(`/dashboard/gitlab/${proy.uuid}`)
													}
													className="bg-white border-2 border-slate-200 p-8 rounded-[3rem] hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group active:scale-95 border-b-8 hover:border-blue-600"
												>
													<div className="flex justify-between items-start mb-6">
														<span className="text-sm font-black text-slate-950 uppercase line-clamp-2 group-hover:text-blue-700">
															{proy.nombre}
														</span>
														<div
															className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${proy.activo ? "bg-green-100 text-green-900 border-green-300" : "bg-red-100 text-red-900 border-red-300"}`}
														>
															{proy.activo ? "Activo" : "Inactivo"}
														</div>
													</div>
													<div className="text-[10px] font-black text-slate-500 font-mono bg-slate-50 p-2 rounded-lg truncate">
														ID: {proy.uuid}
													</div>
												</div>
											))
										) : (
											<p className="text-slate-500 font-black text-xs uppercase p-16 bg-slate-100 rounded-[3rem] text-center border-4 border-dashed border-slate-300">
												Sin proyectos asignados
											</p>
										)}
									</div>
								</div>
							</div>

							{isEditing && (
								<div className="flex flex-col sm:flex-row gap-8 pt-16 border-t-4 border-slate-100">
									<button
										type="submit"
										disabled={saving}
										className="flex-[2] bg-slate-950 text-white py-8 rounded-[2.5rem] font-black text-sm tracking-[0.4em] shadow-2xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 border-b-8 border-black"
									>
										{saving ? "PROCESANDO..." : "CONFIRMAR CAMBIOS"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											setEditForm(user);
											setGitlabPassword("");
											setAvatarPreview(getAvatarUrl(user?.fotoperfil));
										}}
										className="flex-1 bg-slate-200 text-slate-700 py-8 rounded-[2.5rem] font-black text-sm tracking-[0.4em] hover:bg-slate-300 transition-all border-b-8 border-slate-400"
									>
										CANCELAR
									</button>
								</div>
							)}
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
