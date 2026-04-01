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
	const [gitlabPassword, setGitlabPassword] = useState(""); // Nuevo estado para creación
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

			// Lógica GitLab: Si el usuario no tenía gitlab y ahora se le pone uno, mandamos la password
			if (!user?.gitlab && editForm.gitlab && gitlabPassword) {
				formData.append("passwordGitlab", gitlabPassword);
			}

			if (avatarFile) formData.append("fotoFile", avatarFile);

			const res = await fetch(`${apiUrl}/api/user/${uuid}`, {
				method: "PATCH",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (res.ok || res.status === 204) {
				setSuccess("Usuario actualizado con éxito");
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

		if (isEditing && editableFields.includes(field)) {
			// NUEVO: Lógica especial para GitLab (Creación)
			if (field === "gitlab" && !user?.gitlab) {
				return (
					<div className="space-y-4 w-full animate-in slide-in-from-top-2 duration-300">
						<div className="bg-orange-50/50 p-6 rounded-[2rem] border-2 border-orange-100/50">
							<p className="text-[9px] font-black text-orange-600 uppercase mb-4 tracking-widest">
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
									className="w-full p-3 border-2 border-orange-200 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:border-orange-500 transition-all placeholder:text-orange-200"
								/>
								{editForm.gitlab && (
									<input
										type="password"
										placeholder="CONTRASEÑA_GITLAB"
										value={gitlabPassword}
										onChange={(e) => setGitlabPassword(e.target.value)}
										className="w-full p-3 border-2 border-orange-200 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:border-orange-500 transition-all animate-in fade-in"
									/>
								)}
							</div>
						</div>
					</div>
				);
			}

			if (field === "wifi") {
				return (
					<label className="flex items-center space-x-3 bg-white p-3 rounded-2xl border-2 border-slate-50 shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
						<input
							type="checkbox"
							checked={!!value}
							onChange={(e) =>
								setEditForm({ ...editForm, [field]: e.target.checked })
							}
							className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
						/>
						<span className="text-xs font-black text-slate-700 uppercase tracking-widest">
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
									className="w-full p-3 pl-11 border-2 border-slate-100 rounded-2xl bg-white text-sm font-bold shadow-sm focus:border-blue-400 outline-none transition-all"
								/>
								<div className="absolute left-4 top-3.5">
									{searchingMaquinas ? (
										<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
									) : (
										<span className="text-slate-400">🔍</span>
									)}
								</div>
							</div>
						)}
						<div className="grid grid-cols-1 gap-2 p-4 border-2 border-slate-50 rounded-[2.5rem] bg-slate-50/50 max-h-60 overflow-y-auto shadow-inner">
							{options.map((opt: any) => {
								const optId = opt.id || opt.idpuerta || opt.idmaquina;
								const isChecked = selectedIds.includes(optId);
								return (
									<label
										key={optId}
										className={`flex items-center space-x-3 p-3 rounded-2xl transition-all cursor-pointer border-2 ${isChecked ? "bg-white shadow-md border-transparent" : "hover:bg-white/60 border-transparent"}`}
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
											className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"
										/>
										<span
											className={`text-sm font-black ${isChecked ? "text-blue-700" : "text-slate-500"}`}
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

			if (field === "activo") {
				return (
					<select
						value={String(value)}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value === "true" })
						}
						className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all"
					>
						<option value="true">ACTIVO</option>
						<option value="false">INACTIVO</option>
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
						className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all"
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
					className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:border-blue-500 transition-all"
				/>
			);
		}

		// --- VISTA LECTURA ---
		if (field === "gitlab") {
			return value ? (
				<span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-xl text-[10px] font-black border border-orange-100 uppercase tracking-widest shadow-sm">
					🦊 {value}
				</span>
			) : (
				<span className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic">
					Sin cuenta vinculada
				</span>
			);
		}

		if (field === "wifi") {
			return (
				<span
					className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest shadow-sm ${value ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}
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
								className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest shadow-sm ${field === "roles" ? getRoleStyle(v.nombre) : "bg-white text-slate-600 border-slate-200"}`}
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
					className={`px-4 py-1.5 rounded-full text-[10px] font-black ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
				>
					{value ? "ACTIVO" : "INACTIVO"}
				</span>
			);
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
				{ field: "responsable", label: "Responsable" },
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
			<div className="h-screen flex items-center justify-center font-black text-slate-400 animate-pulse uppercase text-xs tracking-widest">
				Cargando perfil...
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-5xl mx-auto">
				<div className="flex justify-between items-center mb-10">
					<button
						onClick={() => router.back()}
						className="text-xs font-black tracking-widest text-slate-400 hover:text-blue-600 transition-colors uppercase"
					>
						← Volver
					</button>
				</div>

				<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					{/* CABECERA */}
					<div className="relative bg-slate-900 pt-24 pb-20 px-14 flex flex-col md:flex-row items-center md:items-end gap-12">
						<div className="relative group w-52 h-52 rounded-[3.5rem] border-[10px] border-white overflow-hidden bg-slate-100 shadow-2xl shrink-0 -mb-32 z-10">
							{avatarPreview ? (
								<img
									src={avatarPreview}
									alt="Avatar"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="flex h-full items-center justify-center text-6xl font-black text-slate-300">
									{user?.nombre?.[0]}
								</div>
							)}
							{isEditing && (
								<label className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer backdrop-blur-sm transition-all">
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
									<span className="text-white text-[10px] font-black tracking-widest text-center px-4">
										CAMBIAR FOTO
									</span>
								</label>
							)}
						</div>
						<div className="flex-1 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-2 w-full text-center md:text-left">
							<div>
								<h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-xl leading-[1.1] mb-6">
									{user?.nombre} {user?.apellido1}
								</h1>
								<div className="inline-flex items-center gap-4 bg-white/10 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-sm">
									<div className="relative flex h-3 w-3">
										{user?.activo && (
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
										)}
										<span
											className={`relative inline-flex rounded-full h-3 w-3 ${user?.activo ? "bg-green-500" : "bg-red-500"}`}
										></span>
									</div>
									<p className="text-blue-100 font-bold text-sm tracking-wide">
										{user?.correoinstitucional}
									</p>
								</div>
							</div>
							{!isEditing && (
								<button
									onClick={() => setIsEditing(true)}
									className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-3xl font-black text-[10px] tracking-widest shadow-xl hover:bg-white/10 active:scale-95 transition-all backdrop-blur-sm shrink-0 self-center md:self-end border-b-4 border-white/5"
								>
									✏️ EDITAR PERFIL
								</button>
							)}
						</div>
					</div>

					<div className="h-40"></div>

					<div className="px-20 pb-20">
						{error && (
							<div className="bg-red-50 border-2 border-red-100 text-red-600 p-5 rounded-3xl mb-10 font-black text-[10px] uppercase tracking-widest animate-pulse">
								⚠️ {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-5 rounded-3xl mb-10 font-black text-[10px] uppercase tracking-widest">
								✅ {success}
							</div>
						)}

						<form onSubmit={handleSave} className="space-y-24">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-24 gap-y-20">
								{sections.map((section) => (
									<div key={section.title}>
										<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
											<span className="w-12 h-[2px] bg-blue-600"></span>
											{section.title}
										</h3>
										<div className="space-y-12">
											{section.fields.map((f) => (
												<div
													key={f.field}
													className="flex flex-col space-y-4 pl-8 border-l-2 border-slate-50 hover:border-blue-100 transition-colors group"
												>
													<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-blue-400">
														{f.label}
													</label>
													<div className="min-h-[28px]">
														{renderField(f.field, editForm[f.field])}
													</div>
												</div>
											))}
										</div>
									</div>
								))}

								{/* PROYECTOS GITLAB */}
								<div className="md:col-span-2 pt-10">
									<h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] mb-12 flex items-center gap-4">
										<span className="w-12 h-[2px] bg-slate-900"></span>Proyectos
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
													className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group active:scale-95 border-b-4 hover:border-blue-500"
												>
													<div className="flex justify-between items-start mb-6">
														<span className="text-xs font-black text-slate-800 uppercase line-clamp-2 group-hover:text-blue-600">
															{proy.nombre}
														</span>
														<div
															className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase ${proy.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
														>
															{proy.activo ? "Activo" : "Inactivo"}
														</div>
													</div>
													<div className="text-[9px] font-bold text-slate-400 font-mono truncate">
														ID: {proy.uuid.substring(0, 16)}...
													</div>
												</div>
											))
										) : (
											<p className="text-slate-400 font-black text-[10px] uppercase p-12 bg-slate-50 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
												Sin proyectos asignados
											</p>
										)}
									</div>
								</div>
							</div>

							{isEditing && (
								<div className="flex gap-8 pt-16 border-t border-slate-100">
									<button
										type="submit"
										disabled={saving}
										className="flex-[2] bg-slate-900 text-white py-7 rounded-[2.5rem] font-black text-xs tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 border-b-4 border-black"
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
										className="flex-1 bg-slate-100 text-slate-500 py-7 rounded-[2.5rem] font-black text-xs tracking-[0.3em] hover:bg-slate-200 transition-all border-b-4 border-slate-200"
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
