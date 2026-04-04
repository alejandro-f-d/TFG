"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

// --- INTERFACES ---
interface Dispositivo {
	uuiddispositivo: string;
	nombre: string;
	capacidad: number;
}

interface Reserva {
	uuidcalendario: string;
	nombre_reserva: string;
	nombre_completo_responsable: string;
}

interface Servicio {
	uuidservicio: string;
	nombreservicio: string;
	softwarebase: string;
}

interface MaquinaFull {
	idmaquina: number;
	uuidmaquina: string;
	nombre: string;
	sistemaoperativo: string;
	ram: number;
	esservidor: boolean;
	direccionipprivadav4: string | null;
	direccionippublicav4: string | null;
	puertaenlacev4: string | null;
	direccionipprivadav6: string | null;
	direccionippublicav6: string | null;
	puertaenlacev6: string | null;
	certificadosslactivo: boolean | null;
	caducidadssl: string | null;
	emisorssl: string | null;
	dispositivos: Dispositivo[];
}

export default function MachineDetailPage() {
	const { uuid } = useParams();
	const router = useRouter();

	const [maquina, setMaquina] = useState<MaquinaFull | null>(null);
	const [reservas, setReservas] = useState<Reserva[]>([]);
	const [servicios, setServicios] = useState<Servicio[]>([]);
	const [loading, setLoading] = useState(true);
	const [userPerms, setUserPerms] = useState<string[]>([]);

	// ESTADOS DE ACCIÓN
	const [isEditingMachine, setIsEditingMachine] = useState(false);
	const [machineForm, setMachineForm] = useState<Partial<MaquinaFull>>({});
	const [showDeleteAlert, setShowDeleteAlert] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// --- PERMISOS ---
	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);
			const canView = parsed.some((p: string) =>
				["admin:total", "maq:getAll", "maq:getServer"].includes(p),
			);
			if (!canView) router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const isAdmin = userPerms.includes("admin:total");
	const canEdit = isAdmin || userPerms.includes("maq:editServer");
	const canDelete = isAdmin || userPerms.includes("maq:delete");

	// --- FETCH DATA ---
	const fetchData = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("token");
		const headers = { Authorization: `Bearer ${token}` };
		const apiUrl = process.env.NEXT_PUBLIC_API_URL;

		try {
			const [resMaq, resRes, resServ] = await Promise.all([
				fetch(`${apiUrl}/api/maquina/${uuid}`, { headers }),
				fetch(`${apiUrl}/api/maquina/${uuid}/reserva`, { headers }),
				fetch(`${apiUrl}/api/maquina/${uuid}/servicios?limit=10`, { headers }),
			]);

			if (resMaq.ok) {
				const dataMaq = await resMaq.json();
				const info = dataMaq.info;
				setMaquina({
					...info,
					dispositivos: info.dispositivos || [],
				});
				setMachineForm(info);
			}

			if (resRes.ok) {
				const dataRes = await resRes.json();
				setReservas(dataRes.info || []);
			}

			if (resServ.ok) {
				const dataServ = await resServ.json();
				setServicios(dataServ.info?.data || []);
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

	const handleUpdateMachine = async () => {
		try {
			const token = localStorage.getItem("token");
			// Limpiamos el objeto para no mandar campos extra como 'dispositivos' en el PATCH si no es necesario
			const { dispositivos, uuidmaquina, idmaquina, ...updatePayload } =
				machineForm as any;

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(updatePayload),
				},
			);

			if (res.ok) {
				setIsEditingMachine(false);
				fetchData();
			}
		} catch (e) {
			console.error("Update error:", e);
		}
	};

	const handleDeleteMachine = async () => {
		setIsDeleting(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (res.ok) router.push("/dashboard/maquinas");
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
				Sincronizando Activo...
			</div>
		);

	if (!maquina) return null;

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar { width: 6px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
			`}</style>

			<div className="max-w-7xl mx-auto">
				{/* BARRA SUPERIOR */}
				<div className="flex justify-between items-center mb-12">
					<button
						onClick={() => router.push("/dashboard/maquinas")}
						className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
					>
						← Inventario
					</button>
					<div className="flex items-center gap-4">
						{canDelete && (
							<button
								onClick={() => setShowDeleteAlert(true)}
								className="bg-white border border-red-100 text-red-500 hover:bg-red-50 px-6 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all"
							>
								Borrar
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditingMachine(true)}
								className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all"
							>
								Editar
							</button>
						)}
					</div>
				</div>

				{/* HEADER PRINCIPAL */}
				<div className="mb-16">
					<h1 className="text-8xl font-black text-slate-900 tracking-tighter uppercase leading-none break-all">
						{maquina.nombre}
					</h1>
					<p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] italic mt-4">
						{maquina.sistemaoperativo} • {maquina.ram}GB RAM •{" "}
						{maquina.esservidor ? "SERVER MODE" : "WORKSTATION"}
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* COL 1: REDES */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-6 opacity-[0.07] text-[80px] font-black italic leading-none pointer-events-none text-white">
								v4
							</div>
							<h2 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-8 italic relative z-10">
								Network IPv4
							</h2>
							<div className="space-y-4 relative z-10">
								{["privada", "pública", "gateway"].map((type, i) => {
									const keys = [
										"direccionipprivadav4",
										"direccionippublicav4",
										"puertaenlacev4",
									];
									return (
										<div key={type}>
											<p className="text-[7px] text-slate-500 uppercase font-black mb-1">
												{type}
											</p>
											<p
												className={`font-mono text-[11px] ${i === 1 ? "text-blue-200" : "text-white"}`}
											>
												{(maquina as any)[keys[i]] || "---"}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						{/* IPv6 */}
						<div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-6 opacity-[0.03] text-[80px] font-black italic leading-none pointer-events-none text-slate-900">
								v6
							</div>
							<h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic relative z-10">
								Network IPv6
							</h2>
							<div className="space-y-4 relative z-10">
								{[
									"direccionipprivadav6",
									"direccionippublicav6",
									"puertaenlacev6",
								].map((key) => (
									<div key={key}>
										<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
											{key
												.replace("direcci", "")
												.replace("v6", "")
												.toUpperCase()}
										</p>
										<p className="font-mono text-[11px] text-slate-900 break-all">
											{(maquina as any)[key] || "---"}
										</p>
									</div>
								))}
							</div>
						</div>

						{/* SSL */}
						<div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden">
							<div
								className={`absolute top-0 right-0 w-2 h-full ${maquina.certificadosslactivo ? "bg-emerald-500" : "bg-red-500"}`}
							></div>
							<h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">
								Seguridad SSL
							</h2>
							<div className="space-y-5">
								<div className="flex items-center gap-3">
									<div
										className={`w-2 h-2 rounded-full ${maquina.certificadosslactivo ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
									></div>
									<p className="text-[10px] font-black uppercase text-slate-900">
										{maquina.certificadosslactivo
											? "Certificado Activo"
											: "Sin Protección TLS"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
										Emisor
									</p>
									<p className="text-[10px] font-black text-slate-700 uppercase">
										{maquina.emisorssl || "N/A"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
										Caducidad
									</p>
									<p className="text-[10px] font-mono text-blue-600 font-bold">
										{maquina.caducidadssl
											? new Date(maquina.caducidadssl).toLocaleDateString()
											: "SIN FECHA"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* COL 2: HARDWARE Y SERVICIOS */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 italic">
								Hardware Vinculado
							</h2>
							{maquina.dispositivos.length > 0 ? (
								maquina.dispositivos.map((d) => (
									<div
										key={d.uuiddispositivo}
										className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0"
									>
										<span className="text-[10px] font-black uppercase text-slate-900">
											{d.nombre}
										</span>
										<span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold">
											{d.capacidad}GB
										</span>
									</div>
								))
							) : (
								<p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center py-10 border-2 border-dashed border-slate-50 rounded-3xl">
									Sin dispositivos
								</p>
							)}
						</div>

						<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
							<h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-10">
								Servicios Activos
							</h2>
							{servicios.length > 0 ? (
								servicios.map((s) => (
									<button
										key={s.uuidservicio}
										onClick={() =>
											router.push(`/dashboard/servicios/${s.uuidservicio}`)
										}
										className="w-full text-left p-6 rounded-[2.5rem] bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-600 transition-all mb-4 last:mb-0 shadow-sm group"
									>
										<h3 className="text-[11px] font-black uppercase text-slate-900 group-hover:text-blue-600 transition-colors">
											{s.nombreservicio}
										</h3>
										<p className="text-[8px] text-slate-400 font-bold uppercase">
											{s.softwarebase}
										</p>
									</button>
								))
							) : (
								<p className="text-[9px] font-black text-slate-300 uppercase text-center">
									No se detectan servicios
								</p>
							)}
						</div>
					</div>

					{/* COL 3: RESERVAS */}
					<div className="lg:col-span-4">
						<div className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl min-h-[400px]">
							<h2 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-10 italic">
								Timeline de Reservas
							</h2>
							{reservas.length > 0 ? (
								reservas.map((r) => (
									<button
										key={r.uuidcalendario}
										onClick={() =>
											router.push(
												`/dashboard/reserva/${uuid}/${r.uuidcalendario}`,
											)
										}
										className="w-full text-left p-7 rounded-[2rem] bg-blue-700/30 hover:bg-white hover:text-blue-600 transition-all mb-4 relative overflow-hidden group"
									>
										<h4 className="text-[13px] font-black uppercase mb-2">
											{r.nombre_reserva}
										</h4>
										<p className="text-[8px] font-bold opacity-60 uppercase">
											Responsable: {r.nombre_completo_responsable}
										</p>
									</button>
								))
							) : (
								<div className="h-full flex flex-col items-center justify-center text-center opacity-40">
									<p className="text-[10px] font-black uppercase tracking-widest">
										Sin reservas activas
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* MODAL BORRADO */}
			{showDeleteAlert && (
				<div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
					<div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl text-center">
						<div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-600 text-3xl font-black">
							!
						</div>
						<h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-4">
							¿Eliminar Activo?
						</h3>
						<p className="text-slate-400 text-[11px] font-bold uppercase mb-10 tracking-widest leading-relaxed">
							Purgar <span className="text-red-500">{maquina.nombre}</span> de
							forma irreversible.
						</p>
						<div className="flex flex-col gap-4">
							<button
								onClick={handleDeleteMachine}
								disabled={isDeleting}
								className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${isDeleting ? "bg-slate-100 text-slate-400" : "bg-red-600 text-white hover:bg-red-700 shadow-xl"}`}
							>
								{isDeleting ? "Eliminando..." : "Confirmar"}
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

			{/* MODAL EDICIÓN */}
			{isEditingMachine && (
				<div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-10">
					<div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
						<div className="px-12 lg:px-16 pt-12 pb-8 flex justify-between items-center border-b border-slate-50">
							<h2 className="text-4xl font-black uppercase tracking-tighter">
								Sincronizar <span className="text-blue-600">Activo</span>
							</h2>
							<button
								onClick={() => setIsEditingMachine(false)}
								className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-6 py-3 rounded-full italic hover:bg-slate-100 transition-colors"
							>
								[ Cerrar ]
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-12 lg:px-16 py-10 custom-scrollbar">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-10">
								{/* INFO BASE */}
								<div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-10 rounded-[3rem] mb-4">
									{[
										{ label: "Hostname", key: "nombre", type: "text" },
										{ label: "S.O.", key: "sistemaoperativo", type: "text" },
										{ label: "RAM (GB)", key: "ram", type: "number" },
									].map((f) => (
										<div key={f.key} className="flex flex-col gap-2">
											<label className="text-[9px] font-black uppercase text-slate-400 ml-4">
												{f.label}
											</label>
											<input
												type={f.type}
												className="bg-white rounded-2xl p-5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm"
												defaultValue={(maquina as any)[f.key]}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														[f.key]:
															f.type === "number"
																? Number(e.target.value)
																: e.target.value,
													})
												}
											/>
										</div>
									))}
								</div>

								{/* IPv4 Stack */}
								<div className="space-y-4 bg-slate-50/50 p-8 rounded-[2.5rem]">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-blue-600 pl-4 italic mb-6">
										IPv4 Stack
									</h3>
									{[
										"direccionipprivadav4",
										"direccionippublicav4",
										"puertaenlacev4",
									].map((key) => (
										<input
											key={key}
											className="w-full bg-white border border-slate-100 rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-blue-600 outline-none"
											placeholder={key
												.replace("direccionip", "")
												.replace("v4", "")
												.toUpperCase()}
											defaultValue={(maquina as any)[key] || ""}
											onChange={(e) =>
												setMachineForm({
													...machineForm,
													[key]: e.target.value,
												})
											}
										/>
									))}
								</div>

								{/* IPv6 Stack */}
								<div className="space-y-4 bg-slate-50/50 p-8 rounded-[2.5rem]">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-slate-400 pl-4 italic mb-6">
										IPv6 Stack
									</h3>
									{[
										"direccionipprivadav6",
										"direccionippublicav6",
										"puertaenlacev6",
									].map((key) => (
										<input
											key={key}
											className="w-full bg-white border border-slate-100 rounded-xl p-4 font-mono text-[10px] focus:ring-2 focus:ring-slate-900 outline-none"
											placeholder={key
												.replace("direccionip", "")
												.replace("v6", "")
												.toUpperCase()}
											defaultValue={(maquina as any)[key] || ""}
											onChange={(e) =>
												setMachineForm({
													...machineForm,
													[key]: e.target.value,
												})
											}
										/>
									))}
								</div>

								{/* Seguridad */}
								<div className="space-y-4 bg-slate-50/50 p-8 rounded-[2.5rem]">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-emerald-500 pl-4 italic mb-6">
										TLS / Server
									</h3>
									<input
										className="w-full bg-white border border-slate-100 rounded-xl p-4 font-bold text-xs"
										placeholder="Emisor SSL"
										defaultValue={maquina.emisorssl || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												emisorssl: e.target.value,
											})
										}
									/>
									<input
										type="date"
										className="w-full bg-white border border-slate-100 rounded-xl p-4 font-bold text-xs"
										defaultValue={maquina.caducidadssl?.split("T")[0] || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												caducidadssl: e.target.value,
											})
										}
									/>
									<div className="grid grid-cols-2 gap-4">
										<label className="flex items-center justify-center gap-2 bg-white border border-slate-100 p-4 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
											<input
												type="checkbox"
												className="accent-blue-600"
												defaultChecked={maquina.certificadosslactivo || false}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														certificadosslactivo: e.target.checked,
													})
												}
											/>
											<span className="text-[9px] font-black uppercase">
												SSL
											</span>
										</label>
										<label className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors">
											<input
												type="checkbox"
												className="accent-white"
												defaultChecked={maquina.esservidor}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														esservidor: e.target.checked,
													})
												}
											/>
											<span className="text-[9px] font-black uppercase">
												Server
											</span>
										</label>
									</div>
								</div>
							</div>
						</div>
						<div className="p-10 bg-white border-t border-slate-50">
							<button
								onClick={handleUpdateMachine}
								className="w-full bg-slate-900 text-white py-10 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.6em] hover:bg-blue-600 transition-all shadow-2xl active:scale-[0.99]"
							>
								Confirmar cambios en activo
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
