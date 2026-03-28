// app/dashboard/users/[uuid]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	getEditableFields,
	getFieldConfig,
} from "@/components/config/userEditPermissions";

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
	fechafin?: string;
	responsable?: number;
	roles?: Role[];
	puertas?: Puerta[];
	maquinas_propiedad?: Maquina[];
	fotoperfil?: { type: string; data: number[] } | string | null;
	[key: string]: any;
}

// Función para convertir fotoperfil a URL de imagen
const getAvatarUrl = (fotoperfil: any): string | null => {
	if (!fotoperfil) return null;
	if (typeof fotoperfil === "string") return fotoperfil;
	if (fotoperfil?.type === "Buffer" && Array.isArray(fotoperfil.data)) {
		try {
			const uint8 = new Uint8Array(fotoperfil.data);
			let binary = "";
			for (let i = 0; i < uint8.length; i++) {
				binary += String.fromCharCode(uint8[i]);
			}
			const base64 = btoa(binary);
			return `data:image/png;base64,${base64}`;
		} catch {
			return null;
		}
	}
	return null;
};

// Mapeo de colores por tipo de rol
const getRoleColor = (roleName: string): string => {
	const roleColors: Record<string, string> = {
		responsable: "bg-purple-100 text-purple-700",
		admin: "bg-red-100 text-red-700",
		tecnico: "bg-yellow-100 text-yellow-700",
		usuario: "bg-blue-100 text-blue-700",
		invitado: "bg-gray-100 text-gray-700",
	};
	return roleColors[roleName.toLowerCase()] || "bg-gray-100 text-gray-700";
};

export default function UserDetailPage() {
	const params = useParams();
	const router = useRouter();
	const uuid = params.uuid as string;

	const [user, setUser] = useState<User | null>(null);
	const [currentUserUuid, setCurrentUserUuid] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editableFields, setEditableFields] = useState<string[]>([]);
	const [editForm, setEditForm] = useState<Record<string, any>>({});
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Listas para selects múltiples
	const [rolesList, setRolesList] = useState<Role[]>([]);
	const [puertasList, setPuertasList] = useState<Puerta[]>([]);
	const [maquinasList, setMaquinasList] = useState<Maquina[]>([]);
	const [responsablesList, setResponsablesList] = useState<
		{ id: number; nombre: string; apellido1: string }[]
	>([]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					router.push("/auth/signin");
					return;
				}

				const apiUrl = process.env.NEXT_PUBLIC_API_URL;

				// Obtener UUID del usuario actual
				const currentUuid = localStorage.getItem("uuidUser");
				setCurrentUserUuid(currentUuid || "");

				// Obtener permisos del usuario autenticado
				const permisosRaw = localStorage.getItem("permisos");
				let userPermissions: string[] = [];
				if (permisosRaw) {
					try {
						userPermissions = JSON.parse(permisosRaw);
					} catch (e) {
						console.error("Error al parsear permisos", e);
					}
				}

				const isOwnProfile = currentUuid === uuid;
				const isAdminOrEditor =
					userPermissions.includes("admin:total") ||
					userPermissions.includes("usr:editUsuario");

				// Obtener datos del usuario
				const userRes = await fetch(`${apiUrl}/api/user/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (!userRes.ok) {
					if (userRes.status === 404) {
						throw new Error("Usuario no encontrado");
					}
					throw new Error("Error al cargar usuario");
				}

				const userData = await userRes.json();
				setUser(userData.info);
				setEditForm(userData.info);

				const preview = getAvatarUrl(userData.info.fotoperfil);
				setAvatarPreview(preview);

				// Calcular campos editables
				const editable = getEditableFields(userPermissions, isOwnProfile);
				setEditableFields(editable);

				// Cargar listas para selects múltiples solo si es admin/editor
				if (isAdminOrEditor) {
					const [rolesRes, puertasRes, maquinasRes, responsablesRes] =
						await Promise.all([
							fetch(`${apiUrl}/api/roles`, {
								headers: { Authorization: `Bearer ${token}` },
							}),
							fetch(`${apiUrl}/api/puertas`, {
								headers: { Authorization: `Bearer ${token}` },
							}),
							fetch(`${apiUrl}/api/maquinas`, {
								headers: { Authorization: `Bearer ${token}` },
							}),
							// Obtener todos los usuarios para el selector de responsable
							fetch(`${apiUrl}/api/user?limit=1000`, {
								headers: { Authorization: `Bearer ${token}` },
							}),
						]);

					if (rolesRes.ok) {
						const rolesData = await rolesRes.json();
						setRolesList(rolesData.info || []);
					}
					if (puertasRes.ok) {
						const puertasData = await puertasRes.json();
						setPuertasList(puertasData.info || []);
					}
					if (maquinasRes.ok) {
						const maquinasData = await maquinasRes.json();
						setMaquinasList(maquinasData.info || []);
					}
					if (responsablesRes.ok) {
						const responsablesData = await responsablesRes.json();
						// Filtrar usuarios activos y excluir al usuario actual
						const filteredResponsables =
							responsablesData.info?.filter(
								(r: any) =>
									r.activo !== false &&
									r.idusuario !== userData.info?.idusuario,
							) || [];
						setResponsablesList(filteredResponsables);
					}
				}
			} catch (err) {
				console.error(err);
				setError(
					err instanceof Error ? err.message : "Error al cargar usuario",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [uuid, router]);

	const handleEditChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value, type } = e.target as HTMLInputElement;
		const checked =
			type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

		setEditForm({
			...editForm,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleMultiSelectChange = (field: string, selectedIds: number[]) => {
		setEditForm({
			...editForm,
			[field]: selectedIds,
		});
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validar tamaño de archivo (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				setError("La imagen no puede superar los 5MB");
				return;
			}
			setAvatarFile(file);
			const reader = new FileReader();
			reader.onloadend = () => setAvatarPreview(reader.result as string);
			reader.readAsDataURL(file);
		}
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;

			// Usar FormData para enviar (soporta archivos y arrays)
			const formData = new FormData();

			editableFields.forEach((field) => {
				if (field === "fotoPerfil") return;

				const value = editForm[field];
				if (value !== undefined && value !== null && value !== "") {
					if (Array.isArray(value)) {
						// Para arrays (roles, puertas, máquinas), enviar como JSON string
						formData.append(field, JSON.stringify(value));
					} else if (typeof value === "boolean") {
						formData.append(field, value ? "true" : "false");
					} else {
						formData.append(field, String(value));
					}
				}
			});

			if (avatarFile) {
				formData.append("fotoFile", avatarFile);
			}

			const res = await fetch(`${apiUrl}/api/user/${uuid}`, {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			if (res.status === 204) {
				setSuccess("Usuario actualizado correctamente");
				setIsEditing(false);
				setAvatarFile(null);
				// Recargar datos
				const userRes = await fetch(`${apiUrl}/api/user/${uuid}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (userRes.ok) {
					const userData = await userRes.json();
					setUser(userData.info);
					setEditForm(userData.info);
					setAvatarPreview(getAvatarUrl(userData.info.fotoperfil));
				}
			} else {
				const errorData = await res.json();
				throw new Error(errorData.error || "Error al actualizar usuario");
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	};

	const renderField = (field: string, value: any) => {
		const config = getFieldConfig(field);
		if (!config) return null;

		if (isEditing && editableFields.includes(field)) {
			switch (config.inputType) {
				case "checkbox":
					return (
						<input
							type="checkbox"
							name={field}
							checked={value || false}
							onChange={handleEditChange}
							className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
						/>
					);
				case "select":
					return (
						<select
							name={field}
							value={value || ""}
							onChange={handleEditChange}
							className="w-full px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Sin responsable</option>
							{responsablesList
								.filter((r) => r.id !== user?.idusuario)
								.map((r) => (
									<option key={r.id} value={r.id}>
										{r.nombre} {r.apellido1}
									</option>
								))}
						</select>
					);
				case "multiselect":
					let options: { id: number; nombre: string }[] = [];
					if (field === "roles") options = rolesList;
					else if (field === "puertasAutorizadas") options = puertasList;
					else if (field === "duenoMaquina") options = maquinasList;

					const selectedIds = Array.isArray(value)
						? value.map((v: any) => (typeof v === "object" ? v.id : v))
						: [];
					return (
						<div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
							{options.length === 0 ? (
								<p className="text-sm text-gray-500 text-center py-2">
									No hay elementos disponibles
								</p>
							) : (
								options.map((opt) => (
									<label
										key={opt.id}
										className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition"
									>
										<input
											type="checkbox"
											checked={selectedIds.includes(opt.id)}
											onChange={(e) => {
												const newSelected = e.target.checked
													? [...selectedIds, opt.id]
													: selectedIds.filter((id) => id !== opt.id);
												handleMultiSelectChange(field, newSelected);
											}}
											className="rounded text-blue-600 focus:ring-blue-500"
										/>
										<span className="text-sm text-gray-700">{opt.nombre}</span>
									</label>
								))
							)}
						</div>
					);
				case "date":
					return (
						<input
							type="date"
							name={field}
							value={value ? value.split("T")[0] : ""}
							onChange={handleEditChange}
							className="w-full px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					);
				default:
					return (
						<input
							type={config.inputType || "text"}
							name={field}
							value={value || ""}
							onChange={handleEditChange}
							className="w-full px-3 py-1 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					);
			}
		}

		// Modo visualización
		if (config.inputType === "checkbox") {
			return <span className="text-gray-700">{value ? "Sí" : "No"}</span>;
		}
		if (field === "fechafin" && !value) {
			return <span className="text-gray-500">Sin fecha</span>;
		}
		if (field === "responsable") {
			const responsable = responsablesList.find((r) => r.id === value);
			return (
				<span className="text-gray-700">
					{responsable
						? `${responsable.nombre} ${responsable.apellido1}`
						: "Sin responsable"}
				</span>
			);
		}
		if (field === "roles" && Array.isArray(value)) {
			return (
				<div className="flex flex-wrap gap-1">
					{value.map((role: any) => (
						<span
							key={role.id}
							className={`text-xs px-2 py-1 rounded-full ${getRoleColor(
								role.nombre,
							)}`}
						>
							{role.nombre}
						</span>
					))}
				</div>
			);
		}
		if (field === "puertasAutorizadas" && Array.isArray(value)) {
			return (
				<div className="flex flex-wrap gap-1">
					{value.map((puerta: any) => (
						<span
							key={puerta.id}
							className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
						>
							{puerta.nombre}
						</span>
					))}
				</div>
			);
		}
		if (field === "duenoMaquina" && Array.isArray(value)) {
			return (
				<div className="flex flex-wrap gap-1">
					{value.map((maquina: any) => (
						<span
							key={maquina.id}
							className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
						>
							{maquina.nombre}
						</span>
					))}
				</div>
			);
		}
		return <span className="text-gray-700">{value || "-"}</span>;
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-100 py-12">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
						<div className="space-y-4">
							{[1, 2, 3, 4, 5].map((i) => (
								<div key={i} className="h-12 bg-gray-200 rounded"></div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="min-h-screen bg-gray-100 py-12">
				<div className="container mx-auto px-4 text-center">
					<p className="text-red-600">Usuario no encontrado</p>
					<button
						onClick={() => router.push("/dashboard/users")}
						className="mt-4 text-blue-600 hover:underline"
					>
						Volver a la lista
					</button>
				</div>
			</div>
		);
	}

	const displayFields = [
		{ field: "nombre", label: "Nombre" },
		{ field: "apellido1", label: "Primer apellido" },
		{ field: "apellido2", label: "Segundo apellido" },
		{ field: "correoinstitucional", label: "Correo institucional" },
		{ field: "usuariovpn", label: "Usuario VPN" },
		{ field: "gitlab", label: "GitLab" },
		{ field: "tarjetaacceso", label: "Tarjeta acceso" },
		{ field: "diriplastlogin", label: "Última IP de login" },
		{ field: "fechaincorporacion", label: "Fecha de incorporación" },
		{ field: "fechafin", label: "Fecha fin" },
		{ field: "activo", label: "Activo" },
		{ field: "teams", label: "Teams" },
		{ field: "wifi", label: "WiFi" },
		{ field: "esresponsable", label: "Es responsable" },
		{ field: "responsable", label: "Responsable" },
		{ field: "roles", label: "Roles" },
		{ field: "puertasAutorizadas", label: "Puertas autorizadas" },
		{ field: "duenoMaquina", label: "Máquinas en propiedad" },
	];

	return (
		<div className="min-h-screen bg-gray-100 py-12">
			<div className="container mx-auto px-4">
				<div className="max-w-3xl mx-auto">
					{/* Header con botón de edición */}
					<div className="flex justify-between items-center mb-6">
						<button
							onClick={() => router.push("/dashboard/users")}
							className="text-blue-600 hover:text-blue-800 flex items-center transition"
						>
							<svg
								className="w-5 h-5 mr-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 19l-7-7m0 0l7-7m-7 7h18"
								/>
							</svg>
							Volver
						</button>
						{!isEditing && editableFields.length > 0 && (
							<button
								onClick={() => setIsEditing(true)}
								className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
							>
								Editar usuario
							</button>
						)}
					</div>

					{/* Foto de perfil */}
					<div className="bg-white rounded-xl shadow-md p-6 mb-6">
						<div className="flex flex-col items-center">
							<div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shadow-md">
								{avatarPreview ? (
									<img
										src={avatarPreview}
										alt="Avatar"
										className="w-full h-full object-cover"
									/>
								) : user.fotoperfil ? (
									<img
										src={getAvatarUrl(user.fotoperfil) || ""}
										alt="Avatar"
										className="w-full h-full object-cover"
									/>
								) : (
									<span className="text-4xl font-bold text-blue-600">
										{user.nombre.charAt(0)}
										{user.apellido1.charAt(0)}
										{user.apellido2?.charAt(0) || ""}
									</span>
								)}
							</div>
							{isEditing && editableFields.includes("fotoPerfil") && (
								<div className="mt-4">
									<label className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm font-medium">
										<input
											type="file"
											accept="image/*"
											className="hidden"
											ref={fileInputRef}
											onChange={handleAvatarChange}
										/>
										Cambiar foto
									</label>
									{avatarFile && (
										<p className="text-xs text-gray-500 mt-1">
											Archivo seleccionado: {avatarFile.name}
										</p>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Formulario de datos */}
					<div className="bg-white rounded-xl shadow-md p-6">
						{error && (
							<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
								{error}
							</div>
						)}
						{success && (
							<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
								{success}
							</div>
						)}

						<form onSubmit={handleSave}>
							<div className="space-y-4">
								{displayFields.map(({ field, label }) => {
									// Obtener el valor a mostrar
									let value = editForm[field];
									if (
										field === "roles" &&
										(!value || value.length === 0) &&
										user?.roles
									)
										value = user.roles;
									if (
										field === "puertasAutorizadas" &&
										(!value || value.length === 0) &&
										user?.puertas
									)
										value = user.puertas;
									if (
										field === "duenoMaquina" &&
										(!value || value.length === 0) &&
										user?.maquinas_propiedad
									)
										value = user.maquinas_propiedad;

									return (
										<div
											key={field}
											className="grid grid-cols-3 gap-4 items-start"
										>
											<label className="font-medium text-gray-700 pt-1">
												{label}:
											</label>
											<div className="col-span-2">
												{renderField(field, value)}
											</div>
										</div>
									);
								})}
							</div>

							{isEditing && (
								<div className="flex space-x-3 mt-6 pt-4 border-t">
									<button
										type="submit"
										disabled={saving}
										className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
									>
										{saving ? "Guardando..." : "Guardar cambios"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsEditing(false);
											setError("");
											setSuccess("");
											setAvatarFile(null);
											setEditForm(user);
											setAvatarPreview(getAvatarUrl(user.fotoperfil));
										}}
										className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
									>
										Cancelar
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
