"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import BackButton from "@/components/backButton/BackButton";

export default function CreateMachinePage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Estructura plana para compatibilidad directa con el backend
	const [formData, setFormData] = useState({
		nombre: "",
		caducidadSsl: "",
		certificadoSslActivo: false,
		emisorSsl: "",
		direccionIpPrivadaV4: "",
		direccionIpPublicaV4: "",
		direccionIpPrivadaV6: "",
		direccionIpPublicaV6: "",
		puertaEnlaceV4: "",
		puertaEnlaceV6: "",
		ram: 8,
		sistemaOperativo: "",
		esServidor: true,
	});

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

			// Mapeo exacto a la estructura que requiere tu backend
			const payload = {
				nombre: formData.nombre,
				caducidadSsl: formData.caducidadSsl
					? new Date(formData.caducidadSsl).toISOString()
					: null,
				certificadoSslActivo: formData.certificadoSslActivo,
				emisorSsl: formData.emisorSsl,
				red: {
					direccionIpPrivadaV4: formData.direccionIpPrivadaV4,
					direccionIpPublicaV4: formData.direccionIpPublicaV4,
					direccionIpPrivadaV6: formData.direccionIpPrivadaV6,
					direccionIpPublicaV6: formData.direccionIpPublicaV6,
					puertaEnlaceV4: formData.puertaEnlaceV4,
					puertaEnlaceV6: formData.puertaEnlaceV6,
				},
				especificaciones: {
					ram: formData.ram,
					sistemaOperativo: formData.sistemaOperativo,
					esServidor: formData.esServidor,
				},
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
				router.push(`/dashboard/maquinas/${data.uuid || ""}`);
			} else {
				setError(data.error || "Fallo en la validación del activo.");
			}
		} catch (err) {
			setError("Error crítico de comunicación con el nodo central.");
		} finally {
			setLoading(false);
		}
	};

	const inputClass =
		"bg-white border-2 border-slate-300 rounded-[2rem] p-7 font-bold text-lg text-slate-950 outline-none transition-all focus:border-blue-700 focus:ring-4 focus:ring-blue-50 shadow-sm placeholder:text-slate-300";
	const networkInputClass =
		"bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 font-mono text-sm outline-none focus:border-blue-500 transition-all text-white placeholder:text-slate-600";

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* NAVEGACIÓN */}
				<div className="flex justify-between items-center mb-16">
					<div className="mb-6">
						<BackButton />
					</div>
					<div className="bg-slate-950 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl border-b-4 border-blue-900">
						Provisioning Mode
					</div>
				</div>

				<header className="mb-20">
					<h1 className="text-9xl font-black text-slate-950 tracking-tighter uppercase leading-[0.75]">
						Nuevo
						<br />
						<span className="text-blue-700">Activo.</span>
					</h1>
				</header>

				{error && (
					<div className="mb-10 p-8 bg-red-600 text-white rounded-[2.5rem] shadow-2xl flex items-center gap-6 animate-pulse border-b-8 border-red-800">
						<span className="text-4xl font-black">!</span>
						<p className="text-xs font-black uppercase tracking-[0.2em]">
							{error}
						</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-12">
					{/* 01. IDENTIFICADORES */}
					<section className="bg-white p-12 rounded-[4rem] shadow-2xl border-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-10">
						<div className="md:col-span-2 flex items-center gap-4">
							<h2 className="text-[12px] font-black uppercase text-slate-950 tracking-[0.4em] italic">
								01. Identificadores
							</h2>
						</div>
						<div className="flex flex-col gap-3">
							<label className="text-[10px] font-black uppercase text-slate-600 ml-6">
								Hostname *
							</label>
							<input
								required
								className={inputClass}
								value={formData.nombre}
								onChange={(e) =>
									setFormData({ ...formData, nombre: e.target.value })
								}
							/>
						</div>
						<div className="flex flex-col gap-3">
							<label className="text-[10px] font-black uppercase text-slate-600 ml-6">
								S.O. *
							</label>
							<input
								required
								className={inputClass}
								value={formData.sistemaOperativo}
								onChange={(e) =>
									setFormData({ ...formData, sistemaOperativo: e.target.value })
								}
							/>
						</div>
					</section>

					{/* 02. RED IPv4 */}
					<section className="bg-slate-950 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-b-8 border-blue-900">
						<h2 className="text-[12px] font-black uppercase text-blue-400 tracking-[0.4em] mb-12 italic">
							02. IPv4 Stack
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-400 ml-4">
									IP Privada *
								</label>
								<input
									required
									className={networkInputClass}
									value={formData.direccionIpPrivadaV4}
									onChange={(e) =>
										setFormData({
											...formData,
											direccionIpPrivadaV4: e.target.value,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-400 ml-4">
									IP Pública
								</label>
								<input
									className={networkInputClass}
									value={formData.direccionIpPublicaV4}
									onChange={(e) =>
										setFormData({
											...formData,
											direccionIpPublicaV4: e.target.value,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-400 ml-4">
									Gateway v4 *
								</label>
								<input
									required
									className={networkInputClass}
									value={formData.puertaEnlaceV4}
									onChange={(e) =>
										setFormData({ ...formData, puertaEnlaceV4: e.target.value })
									}
								/>
							</div>
						</div>
					</section>

					{/* 03. RED IPv6 */}
					<section className="bg-white p-12 rounded-[4rem] border-2 border-slate-200 shadow-xl relative overflow-hidden">
						<h2 className="text-[12px] font-black uppercase text-slate-950 tracking-[0.4em] mb-12 italic">
							03. IPv6 Stack
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-600 ml-4">
									IP Privada v6
								</label>
								<input
									className={`${inputClass} p-6 text-sm font-mono`}
									value={formData.direccionIpPrivadaV6}
									onChange={(e) =>
										setFormData({
											...formData,
											direccionIpPrivadaV6: e.target.value,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-600 ml-4">
									IP Pública v6
								</label>
								<input
									className={`${inputClass} p-6 text-sm font-mono text-blue-700`}
									value={formData.direccionIpPublicaV6}
									onChange={(e) =>
										setFormData({
											...formData,
											direccionIpPublicaV6: e.target.value,
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-slate-600 ml-4">
									Gateway v6
								</label>
								<input
									className={`${inputClass} p-6 text-sm font-mono`}
									value={formData.puertaEnlaceV6}
									onChange={(e) =>
										setFormData({ ...formData, puertaEnlaceV6: e.target.value })
									}
								/>
							</div>
						</div>
					</section>

					{/* 04. SSL */}
					<section className="bg-emerald-50 p-12 rounded-[4rem] border-2 border-emerald-300 shadow-xl">
						<h2 className="text-[12px] font-black uppercase text-emerald-800 tracking-[0.4em] mb-12 italic">
							04. SSL Security
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
							<div className="md:col-span-3">
								<div
									onClick={() =>
										setFormData({
											...formData,
											certificadoSslActivo: !formData.certificadoSslActivo,
										})
									}
									className={`p-8 rounded-[2.5rem] cursor-pointer transition-all border-4 flex flex-col items-center shadow-lg ${formData.certificadoSslActivo ? "bg-emerald-700 border-emerald-400 text-white" : "bg-white border-slate-300 text-slate-400"}`}
								>
									<span className="text-[10px] font-black uppercase">
										Status
									</span>
									<span className="text-xl font-black">
										{formData.certificadoSslActivo ? "Active" : "Inactive"}
									</span>
								</div>
							</div>
							<div className="md:col-span-4 flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-emerald-900 ml-4">
									Caducidad
								</label>
								<input
									type="date"
									className="bg-white rounded-2xl p-6 font-black text-sm text-emerald-950 border-2 border-emerald-300"
									value={formData.caducidadSsl}
									onChange={(e) =>
										setFormData({ ...formData, caducidadSsl: e.target.value })
									}
								/>
							</div>
							<div className="md:col-span-5 flex flex-col gap-4">
								<label className="text-[9px] font-black uppercase text-emerald-900 ml-4">
									Emisor
								</label>
								<input
									className="bg-white rounded-2xl p-6 font-bold text-sm text-slate-950 border-2 border-emerald-300"
									value={formData.emisorSsl}
									onChange={(e) =>
										setFormData({ ...formData, emisorSsl: e.target.value })
									}
								/>
							</div>
						</div>
					</section>

					{/* 05. RECURSOS */}
					<section className="bg-white p-12 rounded-[4rem] shadow-2xl border-2 border-slate-200 flex flex-col md:flex-row items-center gap-12">
						<div className="flex-1 w-full">
							<h2 className="text-[12px] font-black uppercase text-slate-950 tracking-[0.4em] mb-10 italic">
								05. Recursos
							</h2>
							<div className="flex items-end gap-6 bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-200">
								<input
									type="number"
									className="bg-transparent font-black text-7xl text-slate-950 outline-none w-full tracking-tighter"
									value={formData.ram}
									onChange={(e) =>
										setFormData({ ...formData, ram: Number(e.target.value) })
									}
								/>
								<span className="text-3xl font-black text-blue-700 mb-2">
									GB RAM
								</span>
							</div>
						</div>
						<div
							onClick={() =>
								setFormData({ ...formData, esServidor: !formData.esServidor })
							}
							className={`p-12 rounded-[3.5rem] cursor-pointer transition-all border-4 w-full md:w-72 text-center shadow-xl ${formData.esServidor ? "bg-blue-700 border-blue-400 text-white" : "bg-slate-100 border-slate-300 opacity-60"}`}
						>
							<span className="text-[11px] font-black uppercase tracking-[0.3em]">
								{formData.esServidor ? "Server Active" : "Workstation"}
							</span>
						</div>
					</section>

					<button
						disabled={loading}
						className={`w-full py-16 rounded-[3.5rem] font-black text-3xl uppercase tracking-[0.8em] transition-all border-b-[12px] ${loading ? "bg-slate-200 text-slate-400 border-slate-300" : "bg-slate-950 text-white border-blue-900 hover:bg-blue-700 active:scale-[0.97]"}`}
					>
						{loading ? "Desplegando..." : "Confirmar Alta"}
					</button>
				</form>
			</div>
		</div>
	);
}
