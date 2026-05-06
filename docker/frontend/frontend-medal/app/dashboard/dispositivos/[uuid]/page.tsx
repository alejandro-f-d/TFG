"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import BackButton from "@/components/backButton/BackButton";

// --- INTERFACES ---
interface TipoDispositivo {
	idtipodispositivo: number;
	nombre: string;
}

interface MaquinaSimplificada {
	idmaquina: number;
	nombre: string;
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
	const params = useParams();
	const uuid = params?.uuid as string;
	const router = useRouter();

	const [dispositivo, setDispositivo] = useState<DispositivoFull | null>(null);
	const [tipos, setTipos] = useState<TipoDispositivo[]>([]);
	const [maquinas, setMaquinas] = useState<MaquinaSimplificada[]>([]);
	const [loading, setLoading] = useState(true);
	const [userPerms, setUserPerms] = useState<string[]>([]);

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
				["admin:total", "disp:get"].includes(p),
			);
			if (!canView) router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const isAdmin = userPerms.includes("admin:total");
	const canEdit = isAdmin || userPerms.includes("disp:edit");
	const canDelete = isAdmin || userPerms.includes("disp:delete");

	// --- FETCH DATA (AJUSTADO AL ARRAY DIRECTO) ---
	const fetchData = useCallback(async () => {
		if (!uuid) return;
		setLoading(true);
		const token = localStorage.getItem("token");
		const headers = { Authorization: `Bearer ${token}` };
		const apiUrl = process.env.NEXT_PUBLIC_API_URL;

		try {
			const [resDev, resTypes, resMaq] = await Promise.all([
				fetch(`${apiUrl}/api/dispositivos/${uuid}`, { headers }),
				fetch(`${apiUrl}/api/dispositivos/tipos`, { headers }),
				fetch(`${apiUrl}/api/maquina?limit=1000`, { headers }),
			]);

			if (resDev.ok) {
				const dataDev = await resDev.json();
				setDispositivo(dataDev.info || dataDev);
				setForm(dataDev.info || dataDev);
			}

			if (resTypes.ok) {
				const dataTypes = await resTypes.json();
				setTipos(dataTypes.tipos || dataTypes || []);
			}

			if (resMaq.ok) {
				const dataMaq = await resMaq.json();
				// Como tu API devuelve el array directo: [ {...}, {...} ]
				setMaquinas(Array.isArray(dataMaq) ? dataMaq : dataMaq.info || []);
			}
		} catch (e) {
			console.error("Error cargando datos:", e);
		} finally {
			setLoading(false);
		}
	}, [uuid]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleUpdate = async () => {
		try {
			const token = localStorage.getItem("token");
			const payload = {
				nombre: form.nombre,
				puntomontaje: form.puntomontaje,
				capacidad: Number(form.capacidad),
				capacidadusada: Number(form.capacidadusada),
				tecnologia: form.tecnologia,
				idmaquina: form.idmaquina ? Number(form.idmaquina) : null,
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
			if (res.ok) router.push("/dashboard/dispositivos");
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
				Cargando Activo...
			</div>
		);
	if (!dispositivo) return null;

	const porcentajeUso =
		Math.round((dispositivo.capacidadusada / dispositivo.capacidad) * 100) || 0;

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<div className="mb-6">
				<BackButton />
			</div>

			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar { width: 8px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; }
			`}</style>

			<div className="max-w-6xl mx-auto">
				{/* NAVBAR INTERNA */}
				<div className="flex justify-between items-center mb-12">
					<div className="flex items-center gap-4">
						{canDelete && (
							<button
								onClick={() => setShowDeleteAlert(true)}
								className="bg-white border-2 border-red-200 text-red-600 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase shadow-sm"
							>
								Purgar Unidad
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditing(true)}
								className="bg-slate-950 text-white px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase hover:bg-blue-700 shadow-xl border-b-4 border-black"
							>
								Modificar
							</button>
						)}
					</div>
				</div>

				{/* HEADER INFO */}
				<div className="mb-16">
					<h1 className="text-8xl font-black text-slate-950 tracking-tighter uppercase leading-[0.85] break-all">
						{dispositivo.nombre}
					</h1>
					<div className="flex gap-4 mt-8">
						<span className="bg-white border-2 border-slate-200 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest">
							{dispositivo.tipo_dispositivo_nombre}
						</span>
						<span className="bg-blue-700 text-white px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest">
							{dispositivo.tecnologia}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					<div className="lg:col-span-8 bg-white p-12 rounded-[4rem] shadow-xl border-2 border-slate-100 relative overflow-hidden">
						<div className="absolute top-0 right-0 p-10 opacity-[0.05] text-[140px] font-black italic pointer-events-none text-slate-950">
							{porcentajeUso}%
						</div>
						<h2 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.4em] mb-12 italic border-l-4 border-blue-700 pl-4">
							Estado de Capacidad
						</h2>
						<div className="flex justify-between items-end mb-8 relative z-10">
							<div>
								<p className="text-[10px] font-black text-slate-400 uppercase mb-3">
									Consumido
								</p>
								<p className="text-6xl font-black text-slate-950 leading-none">
									{dispositivo.capacidadusada}
									<span className="text-2xl ml-2 text-slate-400">GB</span>
								</p>
							</div>
							<div className="text-right">
								<p className="text-[10px] font-black text-slate-400 uppercase mb-3">
									Total
								</p>
								<p className="text-3xl font-black text-slate-300">
									{dispositivo.capacidad} GB
								</p>
							</div>
						</div>
						<div className="h-8 w-full bg-slate-100 rounded-2xl overflow-hidden p-1.5 border-2 border-slate-50 relative z-10">
							<div
								className={`h-full rounded-xl transition-all duration-1000 border-b-4 ${porcentajeUso > 90 ? "bg-red-600 border-red-800" : "bg-blue-600 border-blue-800"}`}
								style={{ width: `${porcentajeUso}%` }}
							></div>
						</div>
					</div>

					<div className="lg:col-span-4 bg-slate-950 p-12 rounded-[3.5rem] text-white shadow-2xl border-b-[12px] border-blue-900">
						<h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-12 italic">
							Data Link
						</h2>
						<div className="space-y-10">
							<div>
								<p className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">
									Host Vinculado
								</p>
								<p className="text-base font-black text-emerald-400 uppercase">
									{maquinas.find((m) => m.idmaquina === dispositivo.idmaquina)
										?.nombre || "SIN VINCULAR"}
								</p>
							</div>
							<div>
								<p className="text-[9px] text-slate-500 uppercase font-black mb-3 tracking-widest">
									Mount Path
								</p>
								<p className="font-mono text-xs text-blue-200 bg-white/5 p-4 rounded-xl break-all">
									{dispositivo.puntomontaje || "/N/A"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* MODAL DE EDICIÓN */}
			{isEditing && (
				<div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-50 flex items-center justify-center p-4">
					<div className="bg-[#F1F5F9] w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-2 border-slate-300">
						<div className="bg-white px-12 pt-12 pb-10 flex justify-between items-center border-b-4 border-slate-200">
							<h2 className="text-5xl font-black uppercase text-slate-950">
								Sincronizar <span className="text-blue-700">Hardware</span>
							</h2>
							<button
								onClick={() => setIsEditing(false)}
								className="text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-8 py-4 rounded-full hover:text-red-600 transition-all border-2 border-transparent hover:border-red-200"
							>
								CANCELAR
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-12 rounded-[3.5rem] border-2 border-slate-200">
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">
										Tipo de Unidad
									</label>
									<select
										className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-sm outline-none focus:border-blue-700 transition-all cursor-pointer"
										value={form.idtipodispositivo ?? ""}
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

								{/* SELECTOR DE VINCULACIÓN HOST */}
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest italic">
										Host Machine (Vinculación)
									</label>
									<select
										className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-black text-sm outline-none focus:border-blue-700 transition-all cursor-pointer"
										value={form.idmaquina ?? ""}
										onChange={(e) =>
											setForm({
												...form,
												idmaquina: e.target.value
													? Number(e.target.value)
													: null,
											})
										}
									>
										<option value="">-- NO VINCULADO (STANDALONE) --</option>
										{maquinas.map((m) => (
											<option key={m.idmaquina} value={m.idmaquina}>
												{m.nombre.toUpperCase()} (ID: {m.idmaquina})
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										Etiqueta
									</label>
									<input
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-black text-base focus:border-blue-700 outline-none"
										value={form.nombre || ""}
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
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-mono text-base focus:border-blue-700 outline-none"
										value={form.puntomontaje || ""}
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
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-black text-base focus:border-blue-700 outline-none"
										value={form.capacidad || 0}
										onChange={(e) =>
											setForm({ ...form, capacidad: Number(e.target.value) })
										}
									/>
								</div>
								<div className="flex flex-col gap-3">
									<label className="text-[10px] font-black uppercase text-slate-950 ml-4 tracking-widest">
										En Uso (GB)
									</label>
									<input
										type="number"
										className="bg-white border-2 border-slate-200 rounded-2xl p-6 font-black text-base focus:border-blue-700 outline-none"
										value={form.capacidadusada || 0}
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

						<div className="p-12 bg-white border-t-4 border-slate-200 shadow-inner">
							<button
								onClick={handleUpdate}
								className="w-full bg-slate-950 text-white py-12 rounded-[3rem] font-black text-2xl uppercase tracking-[0.6em] hover:bg-blue-700 transition-all shadow-2xl border-b-[12px] border-black"
							>
								Confirmar Cambios
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
