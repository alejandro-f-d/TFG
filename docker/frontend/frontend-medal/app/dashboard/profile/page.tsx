// app/dashboard/profile/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/common/Footer";
import { logout } from "@/lib/auth-common";

interface UserProfile {
	idusuario: number;
	nombre: string;
	apellido1: string;
	apellido2: string;
	correoinstitucional: string;
	usuariovpn: string;
	gitlab: string;
	tarjetaacceso: string;
	wifi: boolean;
	teams: boolean;
	fotoperfil?: { type: string; data: number[] } | string | null;
	[key: string]: any;
}

// Validación de contraseña según el esquema del backend
const validatePassword = (
	password: string,
): { isValid: boolean; errors: string[] } => {
	const errors: string[] = [];

	if (password.length < 8) {
		errors.push("La contraseña debe tener al menos 8 caracteres");
	}
	if (password.length > 30) {
		errors.push("La contraseña no puede tener más de 30 caracteres");
	}
	if (!/[a-z]/.test(password)) {
		errors.push("Debe contener al menos una letra minúscula");
	}
	if (!/[A-Z]/.test(password)) {
		errors.push("Debe contener al menos una letra mayúscula");
	}
	if (!/[0-9]/.test(password)) {
		errors.push("Debe contener al menos un número");
	}
	if (!/[!@#$%^&*]/.test(password)) {
		errors.push("Debe contener al menos un carácter especial (!@#$%^&*)");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

export default function ProfilePage() {
	const router = useRouter();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Estados para edición
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState({
		nombre: "",
		apellido1: "",
		apellido2: "",
	});
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Estados para cambio de contraseña
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [passwordError, setPasswordError] = useState("");
	const [passwordSuccess, setPasswordSuccess] = useState("");
	const [savingPassword, setSavingPassword] = useState(false);
	const [passwordValidationErrors, setPasswordValidationErrors] = useState<
		string[]
	>([]);

	// Función para convertir array de bytes a URL de imagen
	const getAvatarUrl = (fotoperfil: any): string | null => {
		if (!fotoperfil) return null;
		if (typeof fotoperfil === "string") return fotoperfil;
		if (fotoperfil.type === "Buffer" && Array.isArray(fotoperfil.data)) {
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

	// Iniciales para fallback
	const getInitials = () => {
		if (!profile) return "?";
		const nombre = profile.nombre || "";
		const apellido1 = profile.apellido1 || "";
		const apellido2 = profile.apellido2 || "";
		return (
			(
				nombre.charAt(0) +
				apellido1.charAt(0) +
				apellido2.charAt(0)
			).toUpperCase() || "?"
		);
	};

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const token = localStorage.getItem("token");
				const uuidUser = localStorage.getItem("uuidUser");
				if (!token || !uuidUser) {
					logout();
					router.push("/auth/signin");
					return;
				}

				const apiUrl = process.env.NEXT_PUBLIC_API_URL;
				const res = await fetch(`${apiUrl}/api/user/${uuidUser}`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (!res.ok) throw new Error("Error al cargar perfil");

				const data = await res.json();
				if (data.info) {
					setProfile(data.info);
					setEditForm({
						nombre: data.info.nombre || "",
						apellido1: data.info.apellido1 || "",
						apellido2: data.info.apellido2 || "",
					});
					// Previsualizar avatar existente
					const preview = getAvatarUrl(data.info.fotoperfil);
					setAvatarPreview(preview);
				} else {
					throw new Error("Datos de perfil no encontrados");
				}
			} catch (err) {
				console.error(err);
				setError("No se pudo cargar la información del perfil.");
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [router]);

	const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEditForm({ ...editForm, [e.target.name]: e.target.value });
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatarFile(file);
			const reader = new FileReader();
			reader.onloadend = () => setAvatarPreview(reader.result as string);
			reader.readAsDataURL(file);
		}
	};

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			const uuidUser = localStorage.getItem("uuidUser");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;

			// Construir FormData para enviar (si hay archivo, usamos FormData, si no, JSON)
			let body: any;
			let headers: HeadersInit = { Authorization: `Bearer ${token}` };
			if (avatarFile) {
				const formData = new FormData();
				formData.append("nombre", editForm.nombre);
				formData.append("apellido1", editForm.apellido1);
				formData.append("apellido2", editForm.apellido2);
				formData.append("fotoperfil", avatarFile);
				body = formData;
				// No establecemos Content-Type para que el navegador lo ponga con boundary
			} else {
				headers["Content-Type"] = "application/json";
				body = JSON.stringify(editForm);
			}

			const res = await fetch(`${apiUrl}/api/user/${uuidUser}`, {
				method: "PUT",
				headers,
				body,
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Error al actualizar perfil");
			}

			const updated = await res.json();
			setProfile(updated.info || updated);
			setSuccess("Perfil actualizado correctamente");
			setIsEditing(false);
			setAvatarFile(null); // limpiar archivo pendiente
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError("");
		setPasswordSuccess("");
		setPasswordValidationErrors([]);

		// Validar que las contraseñas coincidan
		if (passwordData.newPassword !== passwordData.confirmPassword) {
			setPasswordError("Las contraseñas nuevas no coinciden");
			return;
		}

		// Validar la nueva contraseña con las reglas del backend
		const validation = validatePassword(passwordData.newPassword);
		if (!validation.isValid) {
			setPasswordValidationErrors(validation.errors);
			return;
		}

		setSavingPassword(true);
		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			const res = await fetch(`${apiUrl}/api/user/updatePassword`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					passwordAnterior: passwordData.currentPassword,
					passwordNueva: passwordData.newPassword,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Error al cambiar contraseña");
			}

			setPasswordSuccess("Contraseña actualizada correctamente");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			setShowPasswordForm(false);
		} catch (err: any) {
			setPasswordError(err.message);
		} finally {
			setSavingPassword(false);
		}
	};

	// Validar la nueva contraseña en tiempo real mientras el usuario escribe
	const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newPassword = e.target.value;
		setPasswordData({ ...passwordData, newPassword });

		// Validación en tiempo real (opcional)
		if (newPassword.length > 0) {
			const validation = validatePassword(newPassword);
			setPasswordValidationErrors(validation.isValid ? [] : validation.errors);
		} else {
			setPasswordValidationErrors([]);
		}
	};

	if (loading) {
		return (
			<>
				<div className="min-h-screen bg-gray-100 py-12">
					<div className="container mx-auto px-4">
						<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 animate-pulse">
							<div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
							<div className="h-10 bg-gray-200 rounded mb-4"></div>
							<div className="h-10 bg-gray-200 rounded"></div>
						</div>
					</div>
				</div>
				<Footer />
			</>
		);
	}

	return (
		<>
			<div className="min-h-screen bg-gray-100 py-12">
				<div className="container mx-auto px-4">
					<div className="max-w-2xl mx-auto">
						{/* Perfil */}
						<div className="bg-white rounded-xl shadow-md p-6 mb-6">
							<div className="flex justify-between items-center mb-6">
								<h1 className="text-2xl font-bold text-gray-800">Mi perfil</h1>
								{!isEditing && (
									<button
										onClick={() => setIsEditing(true)}
										className="text-blue-600 hover:text-blue-800 text-sm font-medium"
									>
										Editar
									</button>
								)}
							</div>

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

							{/* Foto de perfil */}
							<div className="flex justify-center mb-6">
								<div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
									{avatarPreview ? (
										<img
											src={avatarPreview}
											alt="Avatar"
											className="w-full h-full object-cover"
										/>
									) : profile?.fotoperfil ? (
										<img
											src={getAvatarUrl(profile.fotoperfil) || ""}
											alt="Avatar"
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="text-2xl font-bold text-blue-600">
											{getInitials()}
										</span>
									)}
								</div>
							</div>

							{isEditing && (
								<div className="mb-4 text-center">
									<label className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
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
											Archivo seleccionado
										</p>
									)}
								</div>
							)}

							{isEditing ? (
								<form onSubmit={handleSaveProfile} className="space-y-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Nombre
										</label>
										<input
											type="text"
											name="nombre"
											value={editForm.nombre}
											onChange={handleEditChange}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Primer apellido
										</label>
										<input
											type="text"
											name="apellido1"
											value={editForm.apellido1}
											onChange={handleEditChange}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Segundo apellido
										</label>
										<input
											type="text"
											name="apellido2"
											value={editForm.apellido2}
											onChange={handleEditChange}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Correo institucional
										</label>
										<input
											type="email"
											value={profile?.correoinstitucional || ""}
											disabled
											className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg cursor-not-allowed"
										/>
										<p className="text-xs text-gray-500 mt-1">
											Este campo no se puede modificar
										</p>
									</div>
									<div className="flex space-x-3">
										<button
											type="submit"
											disabled={saving}
											className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
												if (profile) {
													setEditForm({
														nombre: profile.nombre,
														apellido1: profile.apellido1,
														apellido2: profile.apellido2,
													});
													setAvatarPreview(getAvatarUrl(profile.fotoperfil));
												}
											}}
											className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
										>
											Cancelar
										</button>
									</div>
								</form>
							) : (
								<div className="space-y-3">
									<p className="text-gray-700">
										<span className="font-semibold">Nombre completo:</span>{" "}
										{profile?.nombre} {profile?.apellido1} {profile?.apellido2}
									</p>
									<p className="text-gray-700">
										<span className="font-semibold">Correo institucional:</span>{" "}
										{profile?.correoinstitucional}
									</p>
									<p className="text-gray-700">
										<span className="font-semibold">Usuario VPN:</span>{" "}
										{profile?.usuariovpn || "No asignado"}
									</p>
									<p className="text-gray-700">
										<span className="font-semibold">GitLab:</span>{" "}
										{profile?.gitlab || "No asignado"}
									</p>
									<p className="text-gray-700">
										<span className="font-semibold">Tarjeta acceso:</span>{" "}
										{profile?.tarjetaacceso || "No asignada"}
									</p>
								</div>
							)}
						</div>

						{/* Cambiar contraseña */}
						<div className="bg-white rounded-xl shadow-md p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-bold text-gray-800">Seguridad</h2>
								{!showPasswordForm && (
									<button
										onClick={() => setShowPasswordForm(true)}
										className="text-blue-600 hover:text-blue-800 text-sm font-medium"
									>
										Cambiar contraseña
									</button>
								)}
							</div>

							{showPasswordForm && (
								<form onSubmit={handlePasswordChange} className="space-y-4">
									{passwordError && (
										<div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
											{passwordError}
										</div>
									)}
									{passwordSuccess && (
										<div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
											{passwordSuccess}
										</div>
									)}

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Contraseña actual
										</label>
										<input
											type="password"
											value={passwordData.currentPassword}
											onChange={(e) =>
												setPasswordData({
													...passwordData,
													currentPassword: e.target.value,
												})
											}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Nueva contraseña
										</label>
										<input
											type="password"
											value={passwordData.newPassword}
											onChange={handleNewPasswordChange}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
											required
										/>
										{passwordValidationErrors.length > 0 && (
											<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
												<p className="text-xs font-semibold text-yellow-800 mb-1">
													Requisitos de contraseña:
												</p>
												<ul className="text-xs text-yellow-700 space-y-0.5">
													{passwordValidationErrors.map((err, idx) => (
														<li key={idx} className="flex items-start">
															<span className="mr-1">•</span>
															<span>{err}</span>
														</li>
													))}
												</ul>
											</div>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Confirmar nueva contraseña
										</label>
										<input
											type="password"
											value={passwordData.confirmPassword}
											onChange={(e) =>
												setPasswordData({
													...passwordData,
													confirmPassword: e.target.value,
												})
											}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
											required
										/>
										{passwordData.confirmPassword &&
											passwordData.newPassword !==
												passwordData.confirmPassword && (
												<p className="text-xs text-red-500 mt-1">
													Las contraseñas no coinciden
												</p>
											)}
									</div>

									<div className="flex space-x-3">
										<button
											type="submit"
											disabled={savingPassword}
											className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
										>
											{savingPassword
												? "Actualizando..."
												: "Actualizar contraseña"}
										</button>
										<button
											type="button"
											onClick={() => {
												setShowPasswordForm(false);
												setPasswordError("");
												setPasswordSuccess("");
												setPasswordValidationErrors([]);
												setPasswordData({
													currentPassword: "",
													newPassword: "",
													confirmPassword: "",
												});
											}}
											className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
										>
											Cancelar
										</button>
									</div>
								</form>
							)}

							{!showPasswordForm && (
								<p className="text-gray-500 text-sm">
									Cambia tu contraseña periódicamente para mantener tu cuenta
									segura.
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
}
