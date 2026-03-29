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
				const info = Array.isArray(userData.info)
					? userData.info[0]
					: userData.info;

				if (!info) throw new Error("No se pudo procesar la información");

				// Normalizamos el estado inicial para que coincida con los nombres de la config
				const normalizedInfo = {
					...info,
					roles: info.roles || [],
					puertasAutorizadas: info.puertas || [],
					duenoMaquina: info.maquinas_propiedad || [],
				};

				setUser(info);
				setEditForm(normalizedInfo);
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
					if (mRes.ok) {
						const d = await mRes.json();
						const rows = Array.isArray(d) ? d : d.info?.rows || d.info || [];
						setMaquinasList(
							rows.map((m: any) => ({
								id: m.idmaquina || m.id,
								nombre: m.nombre,
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
			// Caso Multiselect (Checkboxes)
			if (["roles", "puertasAutorizadas", "duenoMaquina"].includes(field)) {
				const options =
					field === "roles"
						? rolesList
						: field === "puertasAutorizadas"
							? puertasList
							: maquinasList;
				const selectedIds = Array.isArray(value)
					? value.map((v) =>
							typeof v === "object" ? v.id || v.idpuerta || v.idmaquina : v,
						)
					: [];

				return (
					<div className="grid grid-cols-1 gap-2 p-3 border-2 border-blue-50 rounded-2xl bg-slate-50 max-h-48 overflow-y-auto shadow-inner">
						{options.map((opt) => {
							const optId =
								opt.id || (opt as any).idpuerta || (opt as any).idmaquina;
							const isChecked = selectedIds.includes(optId);
							return (
								<label
									key={optId}
									className={`flex items-center space-x-3 p-2 rounded-xl transition-all cursor-pointer ${isChecked ? "bg-white shadow-sm" : "hover:bg-white/50"}`}
								>
									<input
										type="checkbox"
										checked={isChecked}
										onChange={(e) => {
											const newIds = e.target.checked
												? [...selectedIds, optId]
												: selectedIds.filter((id) => id !== optId);
											setEditForm({ ...editForm, [field]: newIds });
										}}
										className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
									/>
									<span
										className={`text-xs font-bold ${isChecked ? "text-blue-700" : "text-slate-600"}`}
									>
										{opt.nombre}
									</span>
								</label>
							);
						})}
					</div>
				);
			}

			if (config?.inputType === "select") {
				return (
					<select
						value={value ?? ""}
						onChange={(e) =>
							setEditForm({ ...editForm, [field]: e.target.value })
						}
						className="w-full p-2.5 border rounded-xl bg-white text-sm font-bold shadow-sm outline-none focus:border-blue-500"
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
					className="w-full p-2.5 border rounded-xl bg-white text-sm font-bold shadow-sm outline-none focus:border-blue-500"
				/>
			);
		}

		// --- MODO VISUALIZACIÓN ---
		if (
			field === "roles" ||
			field === "puertasAutorizadas" ||
			field === "duenoMaquina"
		) {
			return (
				<div className="flex flex-wrap gap-2">
					{value && value.length > 0 ? (
						value.map((v: any) => (
							<span
								key={v.id || v.idpuerta || v.idmaquina}
								className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${field === "roles" ? getRoleStyle(v.nombre) : "bg-white text-slate-600 border-slate-200 shadow-sm"}`}
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
					className={`px-3 py-1 rounded-full text-[10px] font-black ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
				>
					{value ? "SÍ" : "NO"}
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
						className="text-xs font-black tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
					>
						← VOLVER
					</button>
					{!isEditing && (
						<button
							onClick={() => setIsEditing(true)}
							className="bg-white border-2 border-slate-100 px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
						>
							✏️ EDITAR PERFIL
						</button>
					)}
				</div>

				<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					<div className="relative h-64 bg-slate-900">
						<div className="absolute -bottom-14 left-14 flex items-end space-x-10">
							<div className="relative group w-52 h-52 rounded-[3.5rem] border-[10px] border-white overflow-hidden bg-slate-100 shadow-2xl">
								{avatarPreview ? (
									<img
										src={avatarPreview}
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
										<span className="text-white text-[10px] font-black tracking-widest">
											CAMBIAR FOTO
										</span>
									</label>
								)}
							</div>
							<div className="mb-6">
								<h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
									{user?.nombre} {user?.apellido1}
								</h1>
								<p className="text-blue-200 font-bold text-xs opacity-80 mt-1">
									{user?.correoinstitucional}
								</p>
							</div>
						</div>
					</div>

					<div className="h-24"></div>

					<div className="px-20 pb-20">
						{error && (
							<div className="bg-red-50 border-2 border-red-100 text-red-600 p-5 rounded-2xl mb-10 font-black text-[10px] uppercase tracking-widest">
								⚠️ {error}
							</div>
						)}
						{success && (
							<div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-5 rounded-2xl mb-10 font-black text-[10px] uppercase tracking-widest">
								✅ {success}
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
													className="flex flex-col space-y-3 pl-8 border-l-2 border-slate-50 hover:border-blue-100 transition-colors group"
												>
													<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-blue-400">
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
								<div className="flex gap-6 pt-16 border-t border-slate-50">
									<button
										type="submit"
										disabled={saving}
										className="flex-[2] bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
									>
										{saving ? "PROCESANDO..." : "CONFIRMAR CAMBIOS"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											setEditForm(user);
											setAvatarPreview(getAvatarUrl(user?.fotoperfil));
										}}
										className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[2rem] font-black text-xs tracking-[0.2em] hover:bg-slate-200 transition-all"
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
