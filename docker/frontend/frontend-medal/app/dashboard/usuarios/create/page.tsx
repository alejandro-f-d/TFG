"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/backButton/BackButton";

// Componente Interno que contiene la lógica del formulario
function CreateUserForm() {
	const router = useRouter();

	// Estados de UI
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	// Listas para selects/multi-selects
	const [rolesList, setRolesList] = useState<any[]>([]);
	const [puertasList, setPuertasList] = useState<any[]>([]);
	const [responsablesList, setResponsablesList] = useState<any[]>([]);

	// Búsqueda de máquinas
	const [maquinasList, setMaquinasList] = useState<any[]>([]);
	const [maquinaSearch, setMaquinaSearch] = useState("");
	const [searchingMaquinas, setSearchingMaquinas] = useState(false);

	// Estado del Formulario completo según API POST /api/user
	const [formData, setFormData] = useState({
		nombre: "",
		apellido1: "",
		apellido2: "",
		correoInstitucional: "",
		contrasena: "",
		roles: [] as number[],
		puertasAutorizadas: [] as number[],
		duenoMaquina: [] as number[],
		usuarioVpn: "",
		gitlab: "",
		tarjetaAcceso: "",
		profesorResponsable: "" as string | number,
		fechaIncorporacion: new Date().toISOString().split("T")[0],
		fechaFin: "",
		wifi: false,
		activo: true,
		teams: false,
		esResponsable: false,
	});

	// --- Lógica de Validación de Contraseña (Criterios Joi) ---
	const passwordChecks = {
		length: formData.contrasena.length >= 8 && formData.contrasena.length <= 30,
		hasUpper: /[A-Z]/.test(formData.contrasena),
		hasLower: /[a-z]/.test(formData.contrasena),
		hasNumber: /[0-9]/.test(formData.contrasena),
		hasSymbol: /[!@#$%^&*]/.test(formData.contrasena),
	};
	const isPasswordValid = Object.values(passwordChecks).every(Boolean);

	// Carga inicial de datos
	useEffect(() => {
		const fetchData = async () => {
			try {
				const token = localStorage.getItem("token");
				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
				const [rRes, pRes, uRes] = await Promise.all([
					fetch(`${apiUrl}/api/rol?limit=1000`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${apiUrl}/api/puertas`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(`${apiUrl}/api/user?filtroRevisores=true&limit=10000`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);
				if (rRes.ok) {
					const d = await rRes.json();
					setRolesList(d.info?.rows || d.rows || []);
				}
				if (pRes.ok) {
					const d = await pRes.json();
					setPuertasList(d.info?.rows || d.info || d);
				}
				if (uRes.ok) {
					const d = await uRes.json();
					setResponsablesList(d.info?.rows || d.info || d);
				}
			} catch (err) {
				console.error("Error catálogos:", err);
			}
		};
		fetchData();
	}, []);

	// Buscador de máquinas (Debounce)
	useEffect(() => {
		if (maquinaSearch.length < 2) return;
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
					setMaquinasList(d.info?.rows || d.info || d || []);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setSearchingMaquinas(false);
			}
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [maquinaSearch]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isPasswordValid) {
			setError("La contraseña no cumple los requisitos.");
			return;
		}
		setLoading(true);
		setError("");
		setSuccess("");

		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

			const res = await fetch(`${apiUrl}/api/user`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...formData,
					profesorResponsable: formData.profesorResponsable
						? Number(formData.profesorResponsable)
						: null,
					fechaFin: formData.fechaFin || null,
				}),
			});

			const data = await res.json();
			if (res.ok) {
				setSuccess("Usuario creado con éxito.");
				setTimeout(() => router.push(`/dashboard/usuarios/${data.uuid}`), 1500);
			} else {
				throw new Error(data.error || "Error al crear usuario");
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="p-14 md:p-20 space-y-16">
			{error && (
				<div className="bg-red-50 border-2 border-red-100 text-red-600 p-6 rounded-3xl font-black text-[10px] uppercase tracking-widest">
					⚠️ {error}
				</div>
			)}
			<div className="mb-6">
				<BackButton />
			</div>

			{success && (
				<div className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 p-6 rounded-3xl font-black text-[10px] uppercase tracking-widest">
					✅ {success}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
				{/* COLUMNA 1: DATOS PERSONALES Y CONTRASEÑA */}
				<div className="space-y-10">
					<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
						<span className="w-10 h-[2px] bg-blue-600"></span> Identidad
					</h3>

					<div className="grid grid-cols-1 gap-6">
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								Nombre *
							</label>
							<input
								required
								type="text"
								value={formData.nombre}
								onChange={(e) =>
									setFormData({ ...formData, nombre: e.target.value })
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-black text-base text-slate-950 shadow-sm"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col space-y-2">
								<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
									1º Apellido *
								</label>
								<input
									required
									type="text"
									value={formData.apellido1}
									onChange={(e) =>
										setFormData({ ...formData, apellido1: e.target.value })
									}
									className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
								/>
							</div>
							<div className="flex flex-col space-y-2">
								<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
									2º Apellido
								</label>
								<input
									type="text"
									value={formData.apellido2}
									onChange={(e) =>
										setFormData({ ...formData, apellido2: e.target.value })
									}
									className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
								/>
							</div>
						</div>
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								Correo Institucional *
							</label>
							<input
								required
								type="email"
								value={formData.correoInstitucional}
								onChange={(e) =>
									setFormData({
										...formData,
										correoInstitucional: e.target.value,
									})
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
							/>
						</div>
					</div>

					{/* CONTRASEÑA TIPO RESET PASSWORD */}
					<div className="flex flex-col space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-inner mt-4">
						<label className="text-slate-900 text-[9px] font-black uppercase tracking-widest ml-2">
							Contraseña *
						</label>
						<div className="relative">
							<input
								required
								type={showPassword ? "text" : "password"}
								value={formData.contrasena}
								onChange={(e) =>
									setFormData({ ...formData, contrasena: e.target.value })
								}
								className="w-full p-4 pr-12 border-2 border-slate-400 rounded-2xl bg-white shadow-md font-black text-base text-slate-950 outline-none focus:border-blue-700"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-blue-600"
							>
								{showPassword ? "👁️" : "👁️‍🗨️"}
							</button>
						</div>
						<div className="grid grid-cols-1 gap-1.5 ml-2">
							<div className="flex items-center gap-2">
								<div
									className={`w-1.5 h-1.5 rounded-full ${passwordChecks.length ? "bg-green-500" : "bg-slate-300"}`}
								></div>
								<span
									className={`text-[9px] font-bold ${passwordChecks.length ? "text-green-600" : "text-slate-700"}`}
								>
									8-30 Caracteres
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasUpper && passwordChecks.hasLower ? "bg-green-500" : "bg-slate-300"}`}
								></div>
								<span
									className={`text-[9px] font-bold ${passwordChecks.hasUpper && passwordChecks.hasLower ? "text-green-600" : "text-slate-700"}`}
								>
									Mayúsculas y Minúsculas
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasNumber ? "bg-green-500" : "bg-slate-300"}`}
								></div>
								<span
									className={`text-[9px] font-bold ${passwordChecks.hasNumber ? "text-green-600" : "text-slate-700"}`}
								>
									Número
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className={`w-1.5 h-1.5 rounded-full ${passwordChecks.hasSymbol ? "bg-green-500" : "bg-slate-300"}`}
								></div>
								<span
									className={`text-[9px] font-bold ${passwordChecks.hasSymbol ? "text-green-600" : "text-slate-700"}`}
								>
									Símbolo (!@#$%^&*)
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* COLUMNA 2: LABORAL Y SERVICIOS */}
				<div className="space-y-10">
					<h3 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-4">
						<span className="w-10 h-[2px] bg-blue-600"></span> Organización
					</h3>

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								Usuario VPN
							</label>
							<input
								type="text"
								value={formData.usuarioVpn}
								onChange={(e) =>
									setFormData({ ...formData, usuarioVpn: e.target.value })
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
							/>
						</div>
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								GitLab User
							</label>
							<input
								type="text"
								value={formData.gitlab}
								onChange={(e) =>
									setFormData({ ...formData, gitlab: e.target.value })
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
							/>
						</div>
					</div>

					<div className="flex flex-col space-y-2">
						<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
							Nº Tarjeta Acceso
						</label>
						<input
							type="text"
							value={formData.tarjetaAcceso}
							onChange={(e) =>
								setFormData({ ...formData, tarjetaAcceso: e.target.value })
							}
							className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								Alta *
							</label>
							<input
								required
								type="date"
								value={formData.fechaIncorporacion}
								onChange={(e) =>
									setFormData({
										...formData,
										fechaIncorporacion: e.target.value,
									})
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
							/>
						</div>
						<div className="flex flex-col space-y-2">
							<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
								Fin Contrato
							</label>
							<input
								type="date"
								value={formData.fechaFin}
								onChange={(e) =>
									setFormData({ ...formData, fechaFin: e.target.value })
								}
								className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
							/>
						</div>
					</div>

					<div className="flex flex-col space-y-2">
						<label className="text-slate-950 text-[10px] font-black uppercase tracking-widest ml-2">
							Profesor Responsable
						</label>
						<select
							value={formData.profesorResponsable}
							onChange={(e) =>
								setFormData({
									...formData,
									profesorResponsable: e.target.value,
								})
							}
							className="w-full p-4 border-2 border-slate-300 rounded-2xl bg-white font-black text-base text-slate-950 focus:border-blue-700 outline-none"
						>
							<option value="">Selecciona responsable</option>
							{responsablesList.map((r: any) => (
								<option key={r.idusuario} value={r.idusuario}>
									{r.nombre} {r.apellido1}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-slate-50">
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.wifi}
								onChange={(e) =>
									setFormData({ ...formData, wifi: e.target.checked })
								}
								className="w-5 h-5 rounded-lg text-blue-600"
							/>
							<span className="text-[11px] font-black uppercase text-slate-950">
								WiFi
							</span>
						</label>
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.activo}
								onChange={(e) =>
									setFormData({ ...formData, activo: e.target.checked })
								}
								className="w-5 h-5 rounded-lg text-blue-600"
							/>
							<span className="text-[11px] font-black uppercase text-slate-950">
								Activo
							</span>
						</label>
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.esResponsable}
								onChange={(e) =>
									setFormData({ ...formData, esResponsable: e.target.checked })
								}
								className="w-5 h-5 rounded-lg text-blue-600"
							/>
							<span className="text-[11px] font-black uppercase text-slate-950">
								Es Responsable
							</span>
						</label>
						<label className="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								checked={formData.teams}
								onChange={(e) =>
									setFormData({ ...formData, teams: e.target.checked })
								}
								className="w-5 h-5 rounded-lg text-blue-600"
							/>
							<span className="text-[11px] font-black uppercase text-slate-950">
								Teams
							</span>
						</label>
					</div>
				</div>

				{/* PERMISOS MULTISELECT */}
				<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-20 pt-10 border-t border-slate-100">
					<div className="space-y-6">
						<label className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] block">
							Roles Asignados *
						</label>
						<div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-50">
							{rolesList.map((rol: any) => (
								<label
									key={rol.idrole || rol.id}
									className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm cursor-pointer hover:bg-blue-50"
								>
									<input
										type="checkbox"
										checked={formData.roles.includes(rol.idrole || rol.id)}
										onChange={(e) => {
											const id = rol.idrole || rol.id;
											const newRoles = e.target.checked
												? [...formData.roles, id]
												: formData.roles.filter((r) => r !== id);
											setFormData({ ...formData, roles: newRoles });
										}}
										className="w-4 h-4 rounded text-blue-600"
									/>
									<span className="text-xs font-bold text-slate-600 uppercase">
										{rol.nombre}
									</span>
								</label>
							))}
						</div>
					</div>
					<div className="space-y-6">
						<label className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] block">
							Accesos a Puertas
						</label>
						<div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-50">
							{puertasList.map((p: any) => (
								<label
									key={p.idpuerta || p.id}
									className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm cursor-pointer hover:bg-blue-50"
								>
									<input
										type="checkbox"
										checked={formData.puertasAutorizadas.includes(
											p.idpuerta || p.id,
										)}
										onChange={(e) => {
											const id = p.idpuerta || p.id;
											const newPuertas = e.target.checked
												? [...formData.puertasAutorizadas, id]
												: formData.puertasAutorizadas.filter((x) => x !== id);
											setFormData({
												...formData,
												puertasAutorizadas: newPuertas,
											});
										}}
										className="w-4 h-4 rounded text-blue-600"
									/>
									<span className="text-xs font-bold text-slate-600 uppercase">
										{p.nombre}
									</span>
								</label>
							))}
						</div>
					</div>
				</div>

				{/* RESPONSABLE DE MÁQUINAS (BUSCADOR) */}
				<div className="md:col-span-2 pt-10 border-t border-slate-100">
					<label className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] block mb-6">
						Dueño de Máquinas
					</label>
					<div className="relative mb-6">
						<input
							type="text"
							placeholder="Buscar máquina..."
							value={maquinaSearch}
							onChange={(e) => setMaquinaSearch(e.target.value)}
							className="w-full p-4 pl-12 border-2 border-slate-300 rounded-2xl bg-white focus:border-blue-700 outline-none transition-all font-bold text-sm text-slate-950 shadow-sm"
						/>
						<span className="absolute left-4 top-4 opacity-30">🔍</span>
						{searchingMaquinas && (
							<div className="absolute right-4 top-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						)}
					</div>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-40 overflow-y-auto p-2">
						{maquinasList.map((m: any) => (
							<label
								key={m.idmaquina || m.id}
								className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${formData.duenoMaquina.includes(m.idmaquina || m.id) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-50 text-slate-500"}`}
							>
								<input
									type="checkbox"
									className="hidden"
									checked={formData.duenoMaquina.includes(m.idmaquina || m.id)}
									onChange={(e) => {
										const id = m.idmaquina || m.id;
										const newM = e.target.checked
											? [...formData.duenoMaquina, id]
											: formData.duenoMaquina.filter((x) => x !== id);
										setFormData({ ...formData, duenoMaquina: newM });
									}}
								/>
								<span className="text-[10px] font-black uppercase truncate">
									{m.nombre}
								</span>
							</label>
						))}
					</div>
				</div>
			</div>

			<div className="pt-16 border-t border-slate-100">
				<button
					type="submit"
					disabled={loading || !isPasswordValid}
					className={`w-full py-8 rounded-[2.5rem] font-black text-xs tracking-[0.4em] shadow-2xl transition-all border-b-8 ${isPasswordValid ? "bg-slate-900 text-white hover:bg-black border-black" : "bg-slate-200 text-slate-700 border-slate-300 cursor-not-allowed"}`}
				>
					{loading ? "CREANDO..." : "REGISTRAR USUARIO"}
				</button>
			</div>
		</form>
	);
}

// Componente Principal con Suspense
export default function CreateUserPage() {
	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-5xl mx-auto">
				<div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-white">
					<div className="bg-slate-900 py-16 px-14 flex justify-between items-center">
						<div>
							<h1 className="text-4xl font-black text-white tracking-tighter">
								Registrar Usuario
							</h1>
							<p className="text-blue-300 font-bold text-xs mt-2 uppercase opacity-70">
								Sistema de Gestión Medal
							</p>
						</div>
					</div>
					<Suspense
						fallback={
							<div className="p-40 text-center font-black text-slate-300 animate-pulse tracking-[0.5em] text-xs">
								CARGANDO FORMULARIO...
							</div>
						}
					>
						<CreateUserForm />
					</Suspense>
				</div>
			</div>
		</div>
	);
}
