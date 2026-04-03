"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

export default function CreateMachinePage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [formData, setFormData] = useState({
		nombre: "",
		caducidadSsl: "",
		certificadoSslActivo: false,
		emisorSsl: "",
		red: {
			direccionIpPrivadaV4: "",
			direccionIpPublicav4: "",
			puertaEnlaceV4: "",
			direccionIpPrivadav6: "",
			direccionIpPublicav6: "",
			puertaEnlacev6: "",
		},
		especificaciones: {
			sistemaOperativo: "",
			ram: 8,
			esServidor: true,
		},
	});

	// --- CONTROL DE ACCESO ---
	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			const canCreate =
				parsed.includes("admin:total") || parsed.includes("maq:postMaquina");
			if (!canCreate) router.push("/dashboard/maquinas");
		} else {
			logout();
		}
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const token = localStorage.getItem("token");
			// Formateamos la fecha a ISO si existe para cumplir con el esquema Joi
			const payload = {
				...formData,
				caducidadSsl: formData.caducidadSsl
					? new Date(formData.caducidadSsl).toISOString()
					: null,
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				},
			);

			const data = await res.json();

			if (res.ok) {
				router.push(`/dashboard/maquinas/${data.uuid}`);
			} else {
				setError(data.error || "Fallo en la validación del activo.");
			}
		} catch (err) {
			setError("Error crítico de comunicación con el nodo central.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* NAVEGACIÓN */}
				<div className="flex justify-between items-center mb-16">
					<button
						onClick={() => router.back()}
						className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors italic"
					>
						[ Cancelar operación ]
					</button>
					<div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em]">
						Provisioning Mode
					</div>
				</div>

				<header className="mb-20">
					<h1 className="text-9xl font-black text-slate-900 tracking-tighter uppercase leading-[0.75]">
						Nuevo
						<br />
						<span className="text-blue-600">Activo.</span>
					</h1>
				</header>

				{error && (
					<div className="mb-10 p-8 bg-red-600 text-white rounded-[2.5rem] shadow-2xl shadow-red-200 flex items-center gap-6 animate-bounce">
						<span className="text-3xl font-black">!</span>
						<p className="text-[11px] font-black uppercase tracking-widest">
							{error}
						</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-12">
					{/* BLOQUE 01: CORE INFO */}
					<section className="bg-white p-12 rounded-[4rem] shadow-xl shadow-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-10 border border-slate-50">
						<div className="md:col-span-2">
							<h2 className="text-[11px] font-black uppercase text-slate-300 tracking-[0.4em] mb-6 italic">
								01. Identificadores de Sistema
							</h2>
						</div>
						<div className="flex flex-col gap-3">
							<label className="text-[9px] font-black uppercase text-slate-400 ml-6">
								Hostname del Servidor *
							</label>
							<input
								required
								className="bg-slate-50 rounded-[2rem] p-7 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-100 transition-all border-2 border-transparent focus:border-blue-600"
								value={formData.nombre}
								onChange={(e) =>
									setFormData({ ...formData, nombre: e.target.value })
								}
							/>
						</div>
						<div className="flex flex-col gap-3">
							<label className="text-[9px] font-black uppercase text-slate-400 ml-6">
								S.O. / Distribución *
							</label>
							<input
								required
								placeholder="p.ej. Debian 12 / Windows Server"
								className="bg-slate-50 rounded-[2rem] p-7 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-100 transition-all border-2 border-transparent focus:border-blue-600"
								value={formData.especificaciones.sistemaOperativo}
								onChange={(e) =>
									setFormData({
										...formData,
										especificaciones: {
											...formData.especificaciones,
											sistemaOperativo: e.target.value,
										},
									})
								}
							/>
						</div>
					</section>

					{/* BLOQUE 02: RED IPv4 (DARK MODE) */}
					<section className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
						<div className="absolute top-0 right-0 p-12 opacity-10 text-8xl font-black italic">
							v4
						</div>
						<h2 className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em] mb-12 italic relative z-10">
							02. Stack Network IPv4
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-500 ml-4 tracking-widest">
									IP Privada *
								</label>
								<input
									required
									placeholder="0.0.0.0"
									className="bg-slate-800 rounded-2xl p-6 font-mono text-sm text-blue-300 outline-none focus:ring-2 focus:ring-blue-500"
									value={formData.red.direccionIpPrivadaV4}
									onChange={(e) =>
										setFormData({
											...formData,
											red: {
												...formData.red,
												direccionIpPrivadaV4: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-500 ml-4 tracking-widest">
									IP Pública
								</label>
								<input
									placeholder="Opcional"
									className="bg-slate-800 rounded-2xl p-6 font-mono text-sm text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
									value={formData.red.direccionIpPublicav4}
									onChange={(e) =>
										setFormData({
											...formData,
											red: {
												...formData.red,
												direccionIpPublicav4: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-500 ml-4 tracking-widest">
									Gateway v4 *
								</label>
								<input
									required
									placeholder="192.168.1.1"
									className="bg-slate-800 rounded-2xl p-6 font-mono text-sm text-slate-400 outline-none focus:ring-2 focus:ring-slate-600"
									value={formData.red.puertaEnlaceV4}
									onChange={(e) =>
										setFormData({
											...formData,
											red: { ...formData.red, puertaEnlaceV4: e.target.value },
										})
									}
								/>
							</div>
						</div>
					</section>

					{/* BLOQUE 03: RED IPv6 (LIGHT MODE) */}
					<section className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-xl relative overflow-hidden">
						<div className="absolute top-0 right-0 p-12 opacity-5 text-8xl font-black italic">
							v6
						</div>
						<h2 className="text-[11px] font-black uppercase text-slate-300 tracking-[0.4em] mb-12 italic relative z-10">
							03. Stack Network IPv6
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-400 ml-4 tracking-widest">
									Dirección Privada
								</label>
								<input
									className="bg-slate-50 rounded-2xl p-6 font-mono text-[11px] outline-none focus:ring-2 focus:ring-slate-200"
									value={formData.red.direccionIpPrivadav6}
									onChange={(e) =>
										setFormData({
											...formData,
											red: {
												...formData.red,
												direccionIpPrivadav6: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-400 ml-4 tracking-widest">
									Dirección Pública
								</label>
								<input
									className="bg-slate-50 rounded-2xl p-6 font-mono text-[11px] text-blue-600 outline-none focus:ring-2 focus:ring-blue-100"
									value={formData.red.direccionIpPublicav6}
									onChange={(e) =>
										setFormData({
											...formData,
											red: {
												...formData.red,
												direccionIpPublicav6: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-400 ml-4 tracking-widest">
									Gateway v6
								</label>
								<input
									className="bg-slate-50 rounded-2xl p-6 font-mono text-[11px] outline-none focus:ring-2 focus:ring-slate-200"
									value={formData.red.puertaEnlacev6}
									onChange={(e) =>
										setFormData({
											...formData,
											red: { ...formData.red, puertaEnlacev6: e.target.value },
										})
									}
								/>
							</div>
						</div>
					</section>

					{/* BLOQUE NUEVO: TLS / SSL SECURITY */}
					<section className="bg-emerald-50/30 p-12 rounded-[4rem] border border-emerald-100 shadow-xl relative overflow-hidden">
						<div className="absolute top-0 right-0 p-12 opacity-10 text-8xl font-black italic text-emerald-200">
							SSL
						</div>
						<h2 className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.4em] mb-12 italic relative z-10">
							04. Security Layer (TLS/SSL)
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
							<div className="md:col-span-3">
								<div
									onClick={() =>
										setFormData({
											...formData,
											certificadoSslActivo: !formData.certificadoSslActivo,
										})
									}
									className={`p-8 rounded-[2.5rem] cursor-pointer transition-all border-4 flex flex-col items-center justify-center gap-2 ${
										formData.certificadoSslActivo
											? "bg-emerald-600 border-emerald-200 text-white shadow-lg"
											: "bg-white border-slate-100 text-slate-300"
									}`}
								>
									<span className="text-[9px] font-black uppercase tracking-widest">
										Status
									</span>
									<span className="text-xl font-black uppercase tracking-tighter">
										{formData.certificadoSslActivo ? "Cert Active" : "Inactive"}
									</span>
								</div>
							</div>
							<div className="md:col-span-4 flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-400 ml-4 tracking-widest">
									Fecha de Caducidad
								</label>
								<input
									type="date"
									className="bg-white rounded-2xl p-6 font-black text-xs uppercase text-emerald-700 outline-none border border-emerald-100 focus:ring-4 focus:ring-emerald-50"
									value={formData.caducidadSsl}
									onChange={(e) =>
										setFormData({ ...formData, caducidadSsl: e.target.value })
									}
								/>
							</div>
							<div className="md:col-span-5 flex flex-col gap-4">
								<label className="text-[8px] font-black uppercase text-slate-400 ml-4 tracking-widest">
									Entidad Emisora
								</label>
								<input
									placeholder="p.ej. Let's Encrypt / ZeroSSL"
									className="bg-white rounded-2xl p-6 font-bold text-sm text-slate-700 outline-none border border-emerald-100 focus:ring-4 focus:ring-emerald-50"
									value={formData.emisorSsl}
									onChange={(e) =>
										setFormData({ ...formData, emisorSsl: e.target.value })
									}
								/>
							</div>
						</div>
					</section>

					{/* BLOQUE 05: RECURSOS */}
					<section className="bg-white p-12 rounded-[4rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-12">
						<div className="flex-1 w-full">
							<h2 className="text-[11px] font-black uppercase text-slate-300 tracking-[0.4em] mb-10 italic">
								05. Asignación de Recursos
							</h2>
							<div className="flex items-end gap-4">
								<input
									type="number"
									className="bg-slate-50 rounded-[2rem] p-8 font-black text-5xl text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 w-full"
									value={formData.especificaciones.ram}
									onChange={(e) =>
										setFormData({
											...formData,
											especificaciones: {
												...formData.especificaciones,
												ram: Number(e.target.value),
											},
										})
									}
								/>
								<span className="text-2xl font-black text-slate-300 mb-6 uppercase tracking-tighter">
									GB RAM
								</span>
							</div>
						</div>

						<div
							onClick={() =>
								setFormData({
									...formData,
									especificaciones: {
										...formData.especificaciones,
										esServidor: !formData.especificaciones.esServidor,
									},
								})
							}
							className={`group relative p-10 rounded-[3.5rem] cursor-pointer transition-all duration-500 border-4 w-full md:w-64 text-center ${
								formData.especificaciones.esServidor
									? "bg-blue-600 border-blue-200 shadow-2xl shadow-blue-300"
									: "bg-white border-slate-100 grayscale opacity-50"
							}`}
						>
							<span
								className={`text-[10px] font-black uppercase tracking-[0.3em] ${formData.especificaciones.esServidor ? "text-white" : "text-slate-400"}`}
							>
								{formData.especificaciones.esServidor
									? "Server Active"
									: "Workstation"}
							</span>
							<div
								className={`mt-4 w-full h-2 rounded-full overflow-hidden bg-white/20`}
							>
								<div
									className={`h-full bg-white transition-all duration-700 ${formData.especificaciones.esServidor ? "w-full" : "w-0"}`}
								></div>
							</div>
						</div>
					</section>

					{/* SUBMIT */}
					<button
						disabled={loading}
						className={`w-full py-14 rounded-[3.5rem] font-black text-2xl uppercase tracking-[0.8em] transition-all relative overflow-hidden ${
							loading
								? "bg-slate-100 text-slate-300 cursor-wait"
								: "bg-slate-900 text-white hover:bg-blue-600 hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95"
						}`}
					>
						{loading ? (
							<span className="animate-pulse">Desplegando...</span>
						) : (
							"Confirmar Alta"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
