"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
	fotoperfil?: any;
}

export default function ProfilePage() {
	const router = useRouter();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	// Estados para Edición y Avatar
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState({
		nombre: "",
		apellido1: "",
		apellido2: "",
	});
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Estados para Contraseña
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [showPass, setShowPass] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	// Validación de contraseña (Regex Joi)
	const passwordChecks = {
		length:
			passwordData.newPassword.length >= 8 &&
			passwordData.newPassword.length <= 30,
		hasUpper: /[A-Z]/.test(passwordData.newPassword),
		hasLower: /[a-z]/.test(passwordData.newPassword),
		hasNumber: /[0-9]/.test(passwordData.newPassword),
		hasSymbol: /[!@#$%^&*]/.test(passwordData.newPassword),
	};
	const isPasswordValid = Object.values(passwordChecks).every(Boolean);

	// --- Función Maestra de Conversión de Imagen ---
	const getAvatarUrl = (foto: any): string | null => {
		if (!foto) return null;
		if (typeof foto === "string") return foto;

		if (foto.type === "Buffer" && Array.isArray(foto.data)) {
			try {
				const uint8 = new Uint8Array(foto.data);
				let binary = "";
				const len = uint8.byteLength;
				for (let i = 0; i < len; i++) {
					binary += String.fromCharCode(uint8[i]);
				}
				return `data:image/png;base64,${btoa(binary)}`;
			} catch (e) {
				console.error("Error procesando buffer de imagen:", e);
				return null;
			}
		}
		return null;
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

				// Verificación segura de JSON
				const text = await res.text();
				const data = text ? JSON.parse(text) : {};

				if (data.info) {
					setProfile(data.info);
					setEditForm({
						nombre: data.info.nombre || "",
						apellido1: data.info.apellido1 || "",
						apellido2: data.info.apellido2 || "",
					});
					if (data.info.fotoperfil) {
						setAvatarPreview(getAvatarUrl(data.info.fotoperfil));
					}
				}
			} catch (err) {
				setError("No se pudo sincronizar la información del perfil.");
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, [router]);

	const handleSaveProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			const uuidUser = localStorage.getItem("uuidUser");
			const formData = new FormData();
			formData.append("nombre", editForm.nombre);
			formData.append("apellido1", editForm.apellido1);
			formData.append("apellido2", editForm.apellido2);
			if (avatarFile) formData.append("fotoFile", avatarFile);

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/user/${uuidUser}`,
				{
					method: "PATCH",
					headers: { Authorization: `Bearer ${token}` },
					body: formData,
				},
			);

			if (res.ok) {
				// SOLUCIÓN AL ERROR 204: No intentar .json() si no hay contenido
				const contentType = res.headers.get("content-type");
				if (
					res.status !== 204 &&
					contentType &&
					contentType.includes("application/json")
				) {
					const updated = await res.json();
					setProfile(updated.info || updated);
				} else {
					// Actualización optimista: ya que el servidor dijo OK (204), actualizamos local
					setProfile((prev) =>
						prev
							? {
									...prev,
									nombre: editForm.nombre,
									apellido1: editForm.apellido1,
									apellido2: editForm.apellido2,
								}
							: null,
					);
				}

				setSuccess("Cambios guardados correctamente");
				setIsEditing(false);
				setAvatarFile(null);
			} else {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || "Error al actualizar los datos.");
			}
		} catch (err: any) {
			setError(err.message || "Error al actualizar los datos.");
		} finally {
			setSaving(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!isPasswordValid ||
			passwordData.newPassword !== passwordData.confirmPassword
		)
			return;

		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/user/updatePassword`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						passwordAnterior: passwordData.currentPassword,
						passwordNueva: passwordData.newPassword,
					}),
				},
			);

			if (res.ok) {
				setSuccess("Credenciales actualizadas con éxito");
				setShowPasswordForm(false);
				setPasswordData({
					currentPassword: "",
					newPassword: "",
					confirmPassword: "",
				});
			} else if (res.status === 422) {
				// Manejo específico para contraseña actual incorrecta
				throw new Error("La contraseña actual no es válida");
			} else {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || "Error al actualizar la contraseña");
			}
		} catch (err: any) {
			setError(err.message || "Error de comunicación con el servidor");
		} finally {
			setSaving(false);
		}
	};

	if (loading)
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<div className="text-center space-y-4">
					<div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
						Sincronizando Perfil...
					</p>
				</div>
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					<div className="bg-slate-900 py-16 px-14 flex flex-col md:flex-row items-center gap-10">
						<div className="relative group">
							<div className="w-36 h-36 rounded-[3rem] bg-slate-800 border-4 border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl transition-transform group-hover:scale-[1.02]">
								{avatarPreview ? (
									<img
										src={avatarPreview}
										className="w-full h-full object-cover"
										alt="Avatar"
									/>
								) : (
									<span className="text-5xl font-black text-white uppercase tracking-tighter">
										{profile?.nombre?.charAt(0)}
										{profile?.apellido1?.charAt(0)}
									</span>
								)}
							</div>
							{isEditing && (
								<button
									onClick={() => fileInputRef.current?.click()}
									className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-4 rounded-2xl shadow-xl hover:bg-blue-500 transition-all border-4 border-slate-900"
								>
									📷
								</button>
							)}
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								accept="image/*"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										setAvatarFile(file);
										const reader = new FileReader();
										reader.onloadend = () =>
											setAvatarPreview(reader.result as string);
										reader.readAsDataURL(file);
									}
								}}
							/>
						</div>

						<div className="text-center md:text-left flex-1">
							<h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
								{profile?.nombre} {profile?.apellido1}
							</h1>
							<p className="text-blue-400 font-bold text-xs mt-3 opacity-80 tracking-widest uppercase">
								ID {profile?.idusuario} • {profile?.correoinstitucional}
							</p>
							{!isEditing && (
								<button
									onClick={() => setIsEditing(true)}
									className="mt-6 px-8 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-700 hover:bg-white hover:text-slate-900 transition-all"
								>
									Editar mis datos
								</button>
							)}
						</div>
					</div>

					<div className="p-14 md:p-20">
						{success && (
							<div className="mb-12 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-6 rounded-3xl font-black text-[10px] uppercase tracking-widest">
								✅ {success}
							</div>
						)}
						{error && (
							<div className="mb-12 bg-red-50 border-2 border-red-100 text-red-600 p-6 rounded-3xl font-black text-[10px] uppercase tracking-widest">
								⚠️ {error}
							</div>
						)}

						<form
							onSubmit={handleSaveProfile}
							className="grid grid-cols-1 md:grid-cols-2 gap-16"
						>
							<div className="space-y-10">
								<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
									<span className="w-10 h-[2px] bg-blue-600"></span> Identidad
									Personal
								</h3>

								<div className="flex flex-col space-y-2">
									<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
										Nombre
									</label>
									<input
										disabled={!isEditing}
										type="text"
										value={editForm.nombre}
										onChange={(e) =>
											setEditForm({ ...editForm, nombre: e.target.value })
										}
										className={`w-full p-4 border-2 rounded-2xl font-bold text-sm transition-all ${isEditing ? "border-slate-100 bg-white focus:border-blue-400 shadow-sm" : "border-transparent bg-slate-50 text-slate-500 cursor-not-allowed"}`}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="flex flex-col space-y-2">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
											1º Apellido
										</label>
										<input
											disabled={!isEditing}
											type="text"
											value={editForm.apellido1}
											onChange={(e) =>
												setEditForm({ ...editForm, apellido1: e.target.value })
											}
											className={`w-full p-4 border-2 rounded-2xl font-bold text-sm ${isEditing ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 text-slate-500 cursor-not-allowed"}`}
										/>
									</div>
									<div className="flex flex-col space-y-2">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
											2º Apellido
										</label>
										<input
											disabled={!isEditing}
											type="text"
											value={editForm.apellido2}
											onChange={(e) =>
												setEditForm({ ...editForm, apellido2: e.target.value })
											}
											className={`w-full p-4 border-2 rounded-2xl font-bold text-sm ${isEditing ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 text-slate-500 cursor-not-allowed"}`}
										/>
									</div>
								</div>

								{isEditing && (
									<div className="flex gap-4 pt-6">
										<button
											type="submit"
											disabled={saving}
											className="flex-2 bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-black border-b-4 border-black transition-all"
										>
											{saving ? "Guardando..." : "Confirmar Cambios"}
										</button>
										<button
											type="button"
											onClick={() => setIsEditing(false)}
											className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-[1.5rem] font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all"
										>
											Cancelar
										</button>
									</div>
								)}
							</div>

							<div className="space-y-10">
								<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
									<span className="w-10 h-[2px] bg-blue-600"></span>{" "}
									Conectividad y Accesos
								</h3>
								<div className="grid grid-cols-1 gap-4">
									{[
										{ label: "Usuario VPN", value: profile?.usuariovpn },
										{ label: "GitLab User", value: profile?.gitlab },
										{
											label: "Nº Tarjeta Acceso",
											value: profile?.tarjetaacceso,
										},
									].map((item, idx) => (
										<div
											key={idx}
											className="p-6 bg-slate-50 rounded-[2.2rem] border-2 border-slate-50 flex items-center justify-between group hover:bg-white hover:border-slate-100 transition-all"
										>
											<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
												{item.label}
											</span>
											<span className="text-sm font-bold text-slate-900">
												{item.value || "—"}
											</span>
										</div>
									))}
								</div>
							</div>
						</form>

						<div className="mt-24 pt-16 border-t border-slate-100">
							<div className="flex justify-between items-center mb-12">
								<h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
									<span className="w-10 h-[2px] bg-slate-900"></span> Protección
									de Cuenta
								</h3>
								{!showPasswordForm && (
									<button
										onClick={() => setShowPasswordForm(true)}
										className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
									>
										Modificar Clave
									</button>
								)}
							</div>

							{showPasswordForm && (
								<form
									onSubmit={handlePasswordSubmit}
									className="max-w-2xl space-y-8 bg-slate-50 p-12 rounded-[3.5rem] border-2 border-slate-50 shadow-inner"
								>
									<div className="flex flex-col space-y-2">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
											Clave Actual
										</label>
										<input
											type="password"
											required
											value={passwordData.currentPassword}
											onChange={(e) =>
												setPasswordData({
													...passwordData,
													currentPassword: e.target.value,
												})
											}
											className="w-full p-4 bg-white border-2 border-white rounded-2xl font-bold text-sm shadow-sm outline-none focus:border-blue-400"
										/>
									</div>

									<div className="flex flex-col space-y-4">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
											Nueva Clave de Acceso
										</label>
										<div className="relative">
											<input
												type={showPass ? "text" : "password"}
												required
												value={passwordData.newPassword}
												onChange={(e) =>
													setPasswordData({
														...passwordData,
														newPassword: e.target.value,
													})
												}
												className="w-full p-5 bg-white border-2 border-white rounded-2xl font-bold text-sm shadow-sm outline-none focus:border-blue-500"
											/>
											<button
												type="button"
												onClick={() => setShowPass(!showPass)}
												className="absolute right-5 top-5 text-slate-300 hover:text-blue-600"
											>
												{showPass ? "👁️" : "👁️‍🗨️"}
											</button>
										</div>

										<div className="grid grid-cols-2 gap-y-3 gap-x-6 ml-2 pt-2">
											{Object.entries({
												"8-30 Caracteres": passwordChecks.length,
												"Mayúsculas/Minúsculas":
													passwordChecks.hasUpper && passwordChecks.hasLower,
												"Un Número": passwordChecks.hasNumber,
												"Símbolo Especial": passwordChecks.hasSymbol,
											}).map(([text, active]) => (
												<div key={text} className="flex items-center gap-2">
													<div
														className={`w-2 h-2 rounded-full ${active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-slate-300"}`}
													></div>
													<span
														className={`text-[9px] font-bold uppercase tracking-tighter ${active ? "text-green-600" : "text-slate-400"}`}
													>
														{text}
													</span>
												</div>
											))}
										</div>
									</div>

									<div className="flex flex-col space-y-2">
										<label className="text-slate-400 text-[9px] font-black uppercase tracking-widest ml-2">
											Repetir Clave
										</label>
										<input
											type="password"
											required
											value={passwordData.confirmPassword}
											onChange={(e) =>
												setPasswordData({
													...passwordData,
													confirmPassword: e.target.value,
												})
											}
											className={`w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm shadow-sm transition-all ${passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword ? "border-red-200 bg-red-50/20" : "border-white"}`}
										/>
									</div>

									<div className="flex gap-4 pt-6">
										<button
											type="submit"
											disabled={!isPasswordValid}
											className={`flex-1 py-5 rounded-[1.8rem] font-black text-[10px] tracking-widest uppercase shadow-2xl transition-all ${isPasswordValid ? "bg-slate-900 text-white hover:bg-black border-b-4 border-black" : "bg-slate-200 text-slate-400 cursor-not-allowed border-b-4 border-slate-300"}`}
										>
											Actualizar Credenciales
										</button>
										<button
											type="button"
											onClick={() => setShowPasswordForm(false)}
											className="px-10 bg-white text-slate-400 py-5 rounded-[1.8rem] font-black text-[10px] tracking-widest uppercase hover:text-slate-900 hover:bg-slate-100 transition-all"
										>
											Descartar
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
