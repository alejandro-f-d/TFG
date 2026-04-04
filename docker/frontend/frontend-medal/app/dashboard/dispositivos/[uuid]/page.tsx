"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface TipoDispositivo {
	idtipodispositivo: number;
	nombre: string;
	descripcion: string;
}

interface DispositivoFull {
	iddispositivo: number;
	nombre: string;
	puntomontaje: string;
	capacidad: number;
	capacidadusada: number;
	tecnologia: string;
	uuiddispositivo: string;
	idmaquina: number | null;
	idtipodispositivo: number;
	tipo_dispositivo_nombre: string;
}

export default function DeviceDetailPage() {
	const { uuid } = useParams();
	const router = useRouter();

	const [dispositivo, setDispositivo] = useState<DispositivoFull | null>(null);
	const [tipos, setTipos] = useState<TipoDispositivo[]>([]);
	const [loading, setLoading] = useState(true);
	const [userPerms, setUserPerms] = useState<string[]>([]);

	// ESTADOS DE ACCIÓN
	const [isEditing, setIsEditing] = useState(false);
	const [form, setForm] = useState<Partial<DispositivoFull>>({});
	const [showDeleteAlert, setShowDeleteAlert] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// --- PERMISOS ---
	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);
			const canView = parsed.some((p: string) =>
				["admin:total", "disp:get", "maq:getServer", "maq:getAll"].includes(p),
			);
			if (!canView) router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const isAdmin = userPerms.includes("admin:total");
	const canEdit =
		isAdmin ||
		userPerms.includes("disp:edit") ||
		userPerms.includes("dispositivo:postDispositivo");
	const canDelete = isAdmin || userPerms.includes("disp:delete");

	// --- FETCH DATA ---
	const fetchData = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("token");
		const headers = { Authorization: `Bearer ${token}` };
		const apiUrl = process.env.NEXT_PUBLIC_API_URL;

		try {
			const [resDev, resTypes] = await Promise.all([
				fetch(`${apiUrl}/api/dispositivos/${uuid}`, { headers }),
				fetch(`${apiUrl}/api/dispositivos/tipos`, { headers }),
			]);

			if (resDev.ok) {
				const dataDev = await resDev.json();
				setDispositivo(dataDev.info);
				setForm(dataDev.info);
			}

			if (resTypes.ok) {
				const dataTypes = await resTypes.json();
				setTipos(dataTypes.tipos || []);
			}
		} catch (e) {
			console.error("Fetch error:", e);
		} finally {
			setLoading(false);
		}
	}, [uuid]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// --- LÓGICA DE SALUD (HEALTH) ---
	const getHealthStatus = () => {
		if (!dispositivo)
			return { label: "UNKNOWN", color: "text-slate-400", bg: "bg-slate-50" };
		const porcentaje =
			(dispositivo.capacidadusada / dispositivo.capacidad) * 100;

		if (porcentaje >= 90)
			return {
				label: "CRITICAL LIMIT",
				color: "text-red-600 animate-pulse",
				bg: "bg-red-50",
			};
		if (porcentaje >= 75)
			return {
				label: "WARNING / HIGH LOAD",
				color: "text-amber-600",
				bg: "bg-amber-50",
			};
		return {
			label: "OPTIMAL STATUS",
			color: "text-emerald-500",
			bg: "bg-emerald-50",
		};
	};

	// --- ACCIONES ---
	const handleUpdate = async () => {
		try {
			const token = localStorage.getItem("token");
			const payload = {
				nombre: form.nombre,
				puntomontaje: form.puntomontaje,
				capacidad: Number(form.capacidad),
				capacidadusada: Number(form.capacidadusada),
				tecnologia: form.tecnologia,
				idmaquina: form.idmaquina,
				idtipodispositivo: Number(form.idtipodispositivo),
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/dispositivos/${uuid}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				},
			);

			if (res.ok) {
				setIsEditing(false);
				fetchData();
			}
		} catch (e) {
			console.error("Update error:", e);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/dispositivos/${uuid}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (res.ok) router.back();
		} catch (e) {
			console.error(e);
		} finally {
			setIsDeleting(false);
			setShowDeleteAlert(false);
		}
	};

	if (loading)
		return (
			<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-black uppercase text-slate-300 text-[10px] tracking-[0.5em] animate-pulse">
				Sincronizando Unidad de Datos...
			</div>
		);

	if (!dispositivo) return null;

	const porcentajeUso =
		Math.round((dispositivo.capacidadusada / dispositivo.capacidad) * 100) || 0;
	const health = getHealthStatus();

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* TOP BAR */}
				<div className="flex justify-between items-center mb-12">
					<button
						onClick={() => router.back()}
						className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
					>
						← Volver
					</button>
					<div className="flex items-center gap-4">
						{canDelete && (
							<button
								onClick={() => setShowDeleteAlert(true)}
								className="bg-white border border-red-100 text-red-500 hover:bg-red-50 px-6 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all"
							>
								Purgar Unidad
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditing(true)}
								className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 shadow-lg transition-all"
							>
								Modificar
							</button>
						)}
					</div>
				</div>

				{/* HEADER */}
				<div className="mb-16">
					<div className="flex items-center gap-3 mb-6">
						<span className="bg-blue-600 text-white px-5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-tighter shadow-lg shadow-blue-100">
							{dispositivo.tipo_dispositivo_nombre}
						</span>
						<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-100 px-4 py-1.5 rounded-full">
							{dispositivo.tecnologia}
						</span>
					</div>
					<h1 className="text-8xl font-black text-slate-900 tracking-tighter uppercase leading-none break-all">
						{dispositivo.nombre}
					</h1>
					<p className="text-[10px] font-mono text-slate-400 mt-6 uppercase tracking-widest">
						UUID: {dispositivo.uuiddispositivo}
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* ANALÍTICA DE CAPACIDAD */}
					<div className="lg:col-span-8 bg-white p-12 rounded-[4rem] shadow-xl border border-slate-50 relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-10 opacity-[0.03] text-[120px] font-black italic leading-none pointer-events-none select-none">
							{porcentajeUso}%
						</div>

						<h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 italic relative z-10">
							Capacity Analysis
						</h2>

						<div className="relative z-10">
							<div className="flex justify-between items-end mb-6">
								<div>
									<p className="text-[8px] font-black text-slate-400 uppercase mb-2">
										Espacio Consumido
									</p>
									<p className="text-5xl font-black text-slate-900 leading-none">
										{dispositivo.capacidadusada}
										<span className="text-xl ml-1 text-slate-400">GB</span>
									</p>
								</div>
								<div className="text-right">
									<p className="text-[8px] font-black text-slate-400 uppercase mb-2">
										Total Asignado
									</p>
									<p className="text-2xl font-black text-slate-400">
										{dispositivo.capacidad} GB
									</p>
								</div>
							</div>

							<div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1.5">
								<div
									className={`h-full rounded-full transition-all duration-1000 ease-out ${porcentajeUso > 90 ? "bg-red-500" : "bg-blue-600"}`}
									style={{ width: `${porcentajeUso}%` }}
								></div>
							</div>

							<div className="mt-8 grid grid-cols-3 gap-6">
								<div className="bg-slate-50 p-6 rounded-[2rem]">
									<p className="text-[7px] font-black text-slate-400 uppercase mb-2 italic">
										Ratio
									</p>
									<p className="text-xs font-black text-slate-900">
										{porcentajeUso}% USO
									</p>
								</div>
								<div className="bg-slate-50 p-6 rounded-[2rem]">
									<p className="text-[7px] font-black text-slate-400 uppercase mb-2 italic">
										Disponible
									</p>
									<p className="text-xs font-black text-slate-900">
										{dispositivo.capacidad - dispositivo.capacidadusada} GB
									</p>
								</div>
								<div
									className={`${health.bg} p-6 rounded-[2rem] transition-colors`}
								>
									<p className="text-[7px] font-black text-slate-400 uppercase mb-2 italic">
										Device Health
									</p>
									<p
										className={`text-[10px] font-black uppercase tracking-tighter ${health.color}`}
									>
										{health.label}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* TECH INFO */}
					<div className="lg:col-span-4">
						<div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl h-full">
							<h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-10 italic">
								Data Config
							</h2>
							<div className="space-y-8">
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-2 tracking-tighter">
										Mount Point
									</p>
									<p className="font-mono text-xs text-white bg-white/5 p-4 rounded-2xl break-all">
										{dispositivo.puntomontaje || "/dev/null"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-2 tracking-tighter">
										Technology
									</p>
									<p className="text-sm font-black uppercase text-blue-200">
										{dispositivo.tecnologia}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-2 tracking-tighter">
										Host Machine ID
									</p>
									<p className="text-sm font-black text-white">
										{dispositivo.idmaquina || "N/A"}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MODAL ELIMINAR */}
			{showDeleteAlert && (
				<div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
					<div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl text-center">
						<div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-600 text-3xl font-black italic">
							!
						</div>
						<h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-4">
							¿Confirmar Purga?
						</h3>
						<p className="text-slate-400 text-[11px] font-bold uppercase mb-10 tracking-widest leading-relaxed">
							Esta acción borrará{" "}
							<span className="text-red-500 font-black">
								{dispositivo.nombre}
							</span>{" "}
							de forma irreversible.
						</p>
						<div className="flex flex-col gap-4">
							<button
								onClick={handleDelete}
								disabled={isDeleting}
								className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${isDeleting ? "bg-slate-100 text-slate-400 animate-pulse" : "bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-200"}`}
							>
								{isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
							</button>
							<button
								onClick={() => setShowDeleteAlert(false)}
								className="w-full py-6 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 transition-colors"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL EDICIÓN DINÁMICA */}
			{isEditing && (
				<div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4">
					<div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
						<div className="px-12 pt-12 pb-8 flex justify-between items-center border-b border-slate-50">
							<h2 className="text-4xl font-black uppercase tracking-tighter">
								Hardware <span className="text-blue-600">Sync</span>
							</h2>
							<button
								onClick={() => setIsEditing(false)}
								className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 px-6 py-3 rounded-full italic"
							>
								[ Esc ]
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
							{/* TIPOS Y PROTOCOLOS */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-10 rounded-[3rem]">
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Clasificación Hardware (Tipo)
									</label>
									<select
										className="bg-white rounded-2xl p-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 shadow-sm appearance-none cursor-pointer"
										defaultValue={dispositivo.idtipodispositivo}
										onChange={(e) =>
											setForm({
												...form,
												idtipodispositivo: Number(e.target.value),
											})
										}
									>
										{tipos.map((t) => (
											<option
												key={t.idtipodispositivo}
												value={t.idtipodispositivo}
											>
												{t.nombre.toUpperCase()} - {t.descripcion}
											</option>
										))}
									</select>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Tecnología / Protocolo
									</label>
									<select
										className="bg-white rounded-2xl p-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 shadow-sm appearance-none cursor-pointer"
										defaultValue={dispositivo.tecnologia}
										onChange={(e) =>
											setForm({ ...form, tecnologia: e.target.value })
										}
									>
										<option value="SATA">SATA</option>
										<option value="NVMe">NVMe</option>
										<option value="SSD">SSD GENERIC</option>
										<option value="HDD">HDD MECHANICAL</option>
										<option value="SAS">SAS</option>
										<option value="LTO">LTO TAPE</option>
										<option value="NAS">NETWORK STORAGE</option>
									</select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Nombre del Activo
									</label>
									<input
										className="bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
										defaultValue={dispositivo.nombre}
										onChange={(e) =>
											setForm({ ...form, nombre: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Punto de Montaje
									</label>
									<input
										className="bg-slate-50 border border-slate-100 rounded-2xl p-6 font-mono text-sm focus:ring-2 focus:ring-blue-600 outline-none"
										placeholder="/mnt/data..."
										defaultValue={dispositivo.puntomontaje}
										onChange={(e) =>
											setForm({ ...form, puntomontaje: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Capacidad Total (GB)
									</label>
									<input
										type="number"
										className="bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-sm focus:ring-2 focus:ring-blue-600 outline-none"
										defaultValue={dispositivo.capacidad}
										onChange={(e) =>
											setForm({ ...form, capacidad: Number(e.target.value) })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
										Uso de Datos (GB)
									</label>
									<input
										type="number"
										className={`bg-slate-50 border border-slate-100 rounded-2xl p-6 font-bold text-sm outline-none transition-all focus:ring-2 ${Number(form.capacidadusada) > Number(form.capacidad) ? "ring-2 ring-red-500" : "focus:ring-blue-600"}`}
										defaultValue={dispositivo.capacidadusada}
										onChange={(e) =>
											setForm({
												...form,
												capacidadusada: Number(e.target.value),
											})
										}
									/>
								</div>
							</div>
						</div>

						<div className="p-10 bg-white border-t border-slate-50">
							<button
								onClick={handleUpdate}
								className="w-full bg-slate-900 text-white py-10 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.5em] hover:bg-blue-600 transition-all shadow-2xl active:scale-[0.99]"
							>
								Confirmar Cambios en Dispositivo
							</button>
						</div>
					</div>
				</div>
			)}

			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar { width: 6px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
			`}</style>
		</div>
	);
}
