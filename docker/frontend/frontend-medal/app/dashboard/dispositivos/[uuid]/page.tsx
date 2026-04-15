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
			return {
				label: "UNKNOWN",
				color: "text-slate-500",
				bg: "bg-slate-100",
				border: "border-slate-200",
			};
		const porcentaje =
			(dispositivo.capacidadusada / dispositivo.capacidad) * 100;

		if (porcentaje >= 90)
			return {
				label: "CRITICAL LIMIT",
				color: "text-red-600 animate-pulse",
				bg: "bg-red-50",
				border: "border-red-200",
			};
		if (porcentaje >= 75)
			return {
				label: "WARNING / HIGH LOAD",
				color: "text-amber-700",
				bg: "bg-amber-50",
				border: "border-amber-200",
			};
		return {
			label: "OPTIMAL STATUS",
			color: "text-emerald-600",
			bg: "bg-emerald-50",
			border: "border-emerald-200",
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
			<div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center font-black uppercase text-slate-950 text-xs tracking-[0.5em] animate-pulse">
				Sincronizando Unidad de Datos...
			</div>
		);

	if (!dispositivo) return null;

	const porcentajeUso =
		Math.round((dispositivo.capacidadusada / dispositivo.capacidad) * 100) || 0;
	const health = getHealthStatus();

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* TOP BAR */}
				<div className="flex justify-between items-center mb-12">
					<button
						onClick={() => router.back()}
						className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-950 transition-colors border-b-2 border-transparent hover:border-slate-950"
					>
						← Volver a la Lista
					</button>
					<div className="flex items-center gap-4">
						{canDelete && (
							<button
								onClick={() => setShowDeleteAlert(true)}
								className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
							>
								Purgar Unidad
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditing(true)}
								className="bg-slate-950 text-white px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all border-b-4 border-black active:scale-95"
							>
								Modificar
							</button>
						)}
					</div>
				</div>

				{/* HEADER */}
				<div className="mb-16">
					<div className="flex items-center gap-3 mb-8">
						<span className="bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest border-b-4 border-blue-900 shadow-md">
							{dispositivo.tipo_dispositivo_nombre}
						</span>
						<span className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] bg-white border-2 border-slate-200 px-6 py-2 rounded-xl">
							{dispositivo.tecnologia}
						</span>
					</div>
					<h1 className="text-8xl font-black text-slate-950 tracking-tighter uppercase leading-[0.85] break-all drop-shadow-sm">
						{dispositivo.nombre}
					</h1>
					<p className="text-[11px] font-mono font-black text-slate-500 mt-8 uppercase tracking-widest bg-slate-200/50 inline-block px-4 py-1 rounded">
						ID_FÍSICO: {dispositivo.uuiddispositivo}
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* ANALÍTICA DE CAPACIDAD */}
					<div className="lg:col-span-8 bg-white p-12 rounded-[4rem] shadow-xl border-2 border-slate-100 relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-10 opacity-[0.05] text-[140px] font-black italic leading-none pointer-events-none select-none text-slate-950">
							{porcentajeUso}%
						</div>

						<h2 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.4em] mb-12 italic relative z-10 border-l-4 border-blue-700 pl-4">
							Análisis de Almacenamiento
						</h2>

						<div className="relative z-10">
							<div className="flex justify-between items-end mb-8">
								<div>
									<p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">
										Espacio Consumido
									</p>
									<p className="text-6xl font-black text-slate-950 leading-none">
										{dispositivo.capacidadusada}
										<span className="text-2xl ml-2 text-slate-400">GB</span>
									</p>
								</div>
								<div className="text-right">
									<p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">
										Total Asignado
									</p>
									<p className="text-3xl font-black text-slate-300">
										{dispositivo.capacidad} GB
									</p>
								</div>
							</div>

							<div className="h-8 w-full bg-slate-100 rounded-2xl overflow-hidden p-1.5 border-2 border-slate-50 shadow-inner">
								<div
									className={`h-full rounded-xl transition-all duration-1000 ease-out border-b-4 ${porcentajeUso > 90 ? "bg-red-600 border-red-800" : "bg-blue-600 border-blue-800"}`}
									style={{ width: `${porcentajeUso}%` }}
								></div>
							</div>

							<div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="bg-slate-50 border-2 border-slate-100 p-8 rounded-[2.5rem]">
									<p className="text-[8px] font-black text-slate-400 uppercase mb-3 italic tracking-widest">
										Ratio de Uso
									</p>
									<p className="text-sm font-black text-slate-950">
										{porcentajeUso}% DE CARGA
									</p>
								</div>
								<div className="bg-slate-50 border-2 border-slate-100 p-8 rounded-[2.5rem]">
									<p className="text-[8px] font-black text-slate-400 uppercase mb-3 italic tracking-widest">
										Disponible
									</p>
									<p className="text-sm font-black text-slate-950">
										{dispositivo.capacidad - dispositivo.capacidadusada} GB
										LIBRES
									</p>
								</div>
								<div
									className={`${health.bg} border-2 ${health.border} p-8 rounded-[2.5rem] transition-colors`}
								>
									<p className="text-[8px] font-black text-slate-400 uppercase mb-3 italic tracking-widest">
										Estado de Salud
									</p>
									<p
										className={`text-[11px] font-black uppercase tracking-tighter ${health.color}`}
									>
										{health.label}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* TECH INFO */}
					<div className="lg:col-span-4">
						<div className="bg-slate-950 p-12 rounded-[3.5rem] text-white shadow-2xl h-full border-b-[12px] border-blue-900">
							<h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-12 italic">
								Configuración Técnica
							</h2>
							<div className="space-y-10">
								<div className="border-l-2 border-slate-800 pl-6">
									<p className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">
										Punto de Montaje
									</p>
									<p className="font-mono text-xs text-blue-200 bg-white/5 p-4 rounded-xl break-all border border-white/10 shadow-inner">
										{dispositivo.puntomontaje || "/DEV/NULL"}
									</p>
								</div>
								<div className="border-l-2 border-slate-800 pl-6">
									<p className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">
										Tecnología / Protocolo
									</p>
									<p className="text-base font-black uppercase text-white tracking-widest">
										{dispositivo.tecnologia}
									</p>
								</div>
								<div className="border-l-2 border-slate-800 pl-6">
									<p className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">
										Host Machine Link
									</p>
									<p className="text-base font-black text-emerald-400 uppercase">
										ID_{dispositivo.idmaquina || "NULL"}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MODAL ELIMINAR */}
			{showDeleteAlert && (
				<div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
					<div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl text-center border-2 border-red-500">
						<div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-red-600 text-5xl font-black italic shadow-inner">
							!
						</div>
						<h3 className="text-3xl font-black uppercase tracking-tighter text-slate-950 mb-4">
							¿Confirmar Purga?
						</h3>
						<p className="text-slate-500 text-[11px] font-black uppercase mb-10 tracking-widest leading-relaxed">
							Esta acción borrará el activo{" "}
							<span className="text-red-600 underline font-black">
								{dispositivo.nombre}
							</span>{" "}
							de forma irreversible.
						</p>
						<div className="flex flex-col gap-4">
							<button
								onClick={handleDelete}
								disabled={isDeleting}
								className={`w-full py-8 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all border-b-8 ${isDeleting ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-red-600 text-white border-red-800 hover:bg-red-700 shadow-xl"}`}
							>
								{isDeleting ? "EJECUTANDO..." : "SÍ, ELIMINAR AHORA"}
							</button>
							<button
								onClick={() => setShowDeleteAlert(false)}
								className="w-full py-4 rounded-2xl font-black text-[11px] uppercase text-slate-400 hover:text-slate-950 transition-colors"
							>
								Abortar Operación
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL EDICIÓN DINÁMICA */}
			{isEditing && (
				<div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-50 flex items-center justify-center p-4">
					<div className="bg-[#F1F5F9] w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-2 border-slate-300">
						<div className="bg-white px-12 pt-12 pb-10 flex justify-between items-center border-b-4 border-slate-200">
							<h2 className="text-5xl font-black uppercase tracking-tighter text-slate-950">
								Sincronizar <span className="text-blue-700">Hardware</span>
							</h2>
							<button
								onClick={() => setIsEditing(false)}
								className="text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-8 py-4 rounded-full italic hover:bg-red-50 hover:text-red-600 transition-all border-2 border-transparent hover:border-red-200"
							>
								[ CANCELAR ]
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
							{/* TIPOS Y PROTOCOLOS */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-12 rounded-[3.5rem] border-2 border-slate-200">
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">
										Clasificación Hardware
									</label>
									<select
										className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-slate-950 text-sm outline-none focus:border-blue-700 transition-all cursor-pointer shadow-sm"
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
												{t.nombre.toUpperCase()}
											</option>
										))}
									</select>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">
										Tecnología Aplicada
									</label>
									<select
										className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-slate-950 text-sm outline-none focus:border-blue-700 transition-all cursor-pointer shadow-sm"
										defaultValue={dispositivo.tecnologia}
										onChange={(e) =>
											setForm({ ...form, tecnologia: e.target.value })
										}
									>
										{["SATA", "NVMe", "SSD", "HDD", "SAS", "LTO", "NAS"].map(
											(opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											),
										)}
									</select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										Etiqueta de Activo
									</label>
									<input
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-black text-slate-950 text-base focus:border-blue-700 outline-none transition-all shadow-sm"
										defaultValue={dispositivo.nombre}
										onChange={(e) =>
											setForm({ ...form, nombre: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										Mount Path
									</label>
									<input
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-mono text-base font-bold text-slate-950 focus:border-blue-700 outline-none transition-all shadow-sm"
										placeholder="/mnt/data..."
										defaultValue={dispositivo.puntomontaje}
										onChange={(e) =>
											setForm({ ...form, puntomontaje: e.target.value })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										Capacidad (GB)
									</label>
									<input
										type="number"
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-black text-slate-950 text-base focus:border-blue-700 outline-none transition-all shadow-sm"
										defaultValue={dispositivo.capacidad}
										onChange={(e) =>
											setForm({ ...form, capacidad: Number(e.target.value) })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										Uso Actual (GB)
									</label>
									<input
										type="number"
										className={`bg-white border-2 rounded-2xl p-6 font-black text-base outline-none transition-all shadow-sm ${Number(form.capacidadusada) > Number(form.capacidad) ? "border-red-500 ring-4 ring-red-50 text-red-600" : "border-slate-200 focus:border-blue-700 text-slate-950"}`}
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

						<div className="p-12 bg-white border-t-4 border-slate-200">
							<button
								onClick={handleUpdate}
								className="w-full bg-slate-950 text-white py-12 rounded-[3rem] font-black text-2xl uppercase tracking-[0.6em] hover:bg-blue-700 transition-all shadow-2xl active:scale-[0.98] border-b-[12px] border-black"
							>
								Confirmar Cambios
							</button>
						</div>
					</div>
				</div>
			)}

			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar { width: 8px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; }
			`}</style>
		</div>
	);
}
