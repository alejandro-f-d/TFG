"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

interface Dispositivo {
	uuiddispositivo: string;
	nombre: string;
	puntomontaje: string;
	capacidad: number;
	capacidadusada: number;
	tecnologia: string;
}
interface Reserva {
	uuidcalendario: string;
	nombre_reserva: string;
	descripcion: string;
	fechainicio: string;
	fechafin: string;
	nombre_completo_responsable: string;
}
interface Servicio {
	uuidservicio: string;
	nombreservicio: string;
	status: string;
	softwarebase: string;
	entorno: string;
	lista_puertos: { puerto: number; protocolo: string; nombre: string }[];
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
	certificadosslactivo: boolean;
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
	const [isDeleting, setIsDeleting] = useState(false); // ESTADO PARA EL REDIRECT/BORRADO
	const [userPerms, setUserPerms] = useState<string[]>([]);

	const [isEditingMachine, setIsEditingMachine] = useState(false);
	const [machineForm, setMachineForm] = useState<Partial<MaquinaFull>>({});

	// --- PERMISOS ---
	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);
			if (
				!(
					parsed.includes("admin:total") ||
					parsed.includes("maq:getAll") ||
					parsed.includes("maq:getServer")
				)
			)
				router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const isAdmin = userPerms.includes("admin:total");
	const canEdit = isAdmin || userPerms.includes("maq:editServer");
	const canDelete = isAdmin || userPerms.includes("maq:delete");

	const fetchData = useCallback(async () => {
		setLoading(true);
		const token = localStorage.getItem("token");
		const headers = { Authorization: `Bearer ${token}` };
		try {
			const resMaq = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}`,
				{ headers },
			);
			const dataMaq = await resMaq.json();
			if (resMaq.ok && dataMaq.info) {
				setMaquina({
					...dataMaq.info,
					dispositivos: dataMaq.info.dispositivos || [],
				});
				setMachineForm(dataMaq.info);
			}
			const resRes = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}/reserva`,
				{ headers },
			);
			if (resRes.ok) {
				const d = await resRes.json();
				setReservas(d.info || []);
			}
			const resServ = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}/servicios?limit=10`,
				{ headers },
			);
			if (resServ.ok) {
				const d = await resServ.json();
				setServicios(d.info.data || []);
			}
		} catch (e) {
			console.error(e);
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
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(machineForm),
				},
			);
			if (res.ok) {
				setIsEditingMachine(false);
				fetchData();
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleDeleteMachine = async () => {
		setIsDeleting(true); // INICIAR ESTADO VISUAL DE BORRADO
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${uuid}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (res.ok) {
				router.push("/dashboard/maquinas");
			} else {
				setIsDeleting(false);
				alert("Error al borrar el servidor.");
			}
		} catch (e) {
			setIsDeleting(false);
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
				{/* HEADER ACTIONS */}
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
								onClick={handleDeleteMachine}
								disabled={isDeleting}
								className={`px-6 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all ${isDeleting ? "bg-red-500 text-white animate-pulse" : "bg-white border border-red-100 text-red-500 hover:bg-red-50"}`}
							>
								{isDeleting ? "Purgando..." : "Borrar"}
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditingMachine(true)}
								className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all"
							>
								Sincronizar
							</button>
						)}
					</div>
				</div>

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
					{/* COL 1: RED (IPv4 + IPv6 con GATEWAY) */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-6 opacity-10 text-[40px] font-black italic">
								v4
							</div>
							<h2 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] mb-8 italic">
								Network IPv4
							</h2>
							<div className="space-y-4">
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-1">
										Privada
									</p>
									<p className="font-mono text-sm">
										{maquina.direccionipprivadav4 || "---"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-1">
										Pública
									</p>
									<p className="font-mono text-sm text-blue-200">
										{maquina.direccionippublicav4 || "---"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-500 uppercase font-black mb-1">
										Gateway
									</p>
									<p className="font-mono text-[10px] text-slate-400">
										{maquina.puertaenlacev4 || "---"}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-6 opacity-5 text-[40px] font-black italic">
								v6
							</div>
							<h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">
								Network IPv6
							</h2>
							<div className="space-y-4">
								<div>
									<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
										Privada
									</p>
									<p className="font-mono text-[10px] text-slate-900 break-all">
										{maquina.direccionipprivadav6 || "---"}
									</p>
								</div>
								<div>
									<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
										Pública
									</p>
									<p className="font-mono text-[10px] text-blue-600 break-all">
										{maquina.direccionippublicav6 || "---"}
									</p>
								</div>
								{/* GATEWAY IPv6 AÑADIDO A LA VISTA PRINCIPAL */}
								<div>
									<p className="text-[7px] text-slate-400 uppercase font-black mb-1">
										Gateway v6
									</p>
									<p className="font-mono text-[9px] text-slate-300 break-all">
										{maquina.puertaenlacev6 || "---"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* ... (Resto de columnas se mantienen igual) */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl min-h-[300px]">
							<h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 italic">
								Hardware
							</h2>
							{maquina.dispositivos.map((d) => (
								<div
									key={d.uuiddispositivo}
									className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0"
								>
									<span className="text-[10px] font-black uppercase text-slate-900">
										{d.nombre}
									</span>
									<span className="text-[10px] font-mono text-slate-400">
										{d.capacidad}GB
									</span>
								</div>
							))}
						</div>
						<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
							<h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-10">
								Servicios
							</h2>
							{servicios.map((s) => (
								<button
									key={s.uuidservicio}
									onClick={() =>
										router.push(`/dashboard/servicios/${s.uuidservicio}`)
									}
									className="w-full text-left p-6 rounded-[2.5rem] bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-600 transition-all mb-4 last:mb-0 shadow-sm"
								>
									<h3 className="text-[11px] font-black uppercase text-slate-900">
										{s.nombreservicio}
									</h3>
									<p className="text-[8px] text-slate-400 font-bold uppercase">
										{s.softwarebase}
									</p>
								</button>
							))}
						</div>
					</div>

					<div className="lg:col-span-4">
						<div className="bg-blue-600 p-10 rounded-[3.5rem] text-white shadow-2xl">
							<h2 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-10 italic">
								Próximas Reservas
							</h2>
							{reservas.map((r) => (
								<button
									key={r.uuidcalendario}
									onClick={() =>
										router.push(
											`/dashboard/reserva/${uuid}/${r.uuidcalendario}`,
										)
									}
									className="w-full text-left p-7 rounded-[2rem] bg-blue-700/20 hover:bg-blue-500 transition-all mb-4 relative overflow-hidden group"
								>
									<h4 className="text-[13px] font-black uppercase mb-2">
										{r.nombre_reserva}
									</h4>
									<p className="text-[8px] font-bold text-blue-100/60 uppercase">
										RESP: {r.nombre_completo_responsable}
									</p>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* --- MODAL EDICIÓN CON GATEWAY IPv6 --- */}
			{isEditingMachine && (
				<div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-10">
					<div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
						<div className="px-12 lg:px-16 pt-12 pb-8 flex justify-between items-center border-b border-slate-50">
							<h2 className="text-4xl font-black uppercase tracking-tighter">
								Sincronizar <span className="text-blue-600">Activo</span>
							</h2>
							<button
								onClick={() => setIsEditingMachine(false)}
								className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 px-6 py-3 rounded-full italic"
							>
								[ Cerrar ]
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-12 lg:px-16 py-10 custom-scrollbar">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
								<div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-10 rounded-[3rem] mb-4">
									<div className="flex flex-col gap-2">
										<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
											Hostname
										</label>
										<input
											className="bg-white rounded-2xl p-5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
											defaultValue={maquina.nombre}
											onChange={(e) =>
												setMachineForm({
													...machineForm,
													nombre: e.target.value,
												})
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
											S.O.
										</label>
										<input
											className="bg-white rounded-2xl p-5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
											defaultValue={maquina.sistemaoperativo}
											onChange={(e) =>
												setMachineForm({
													...machineForm,
													sistemaoperativo: e.target.value,
												})
											}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<label className="text-[9px] font-black uppercase text-slate-400 ml-4 italic">
											RAM (GB)
										</label>
										<input
											type="number"
											className="bg-white rounded-2xl p-5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
											defaultValue={maquina.ram}
											onChange={(e) =>
												setMachineForm({
													...machineForm,
													ram: Number(e.target.value),
												})
											}
										/>
									</div>
								</div>

								<div className="space-y-4">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-blue-600 pl-4 italic">
										IPv4
									</h3>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-xs outline-none focus:bg-white"
										placeholder="IP Privada"
										defaultValue={maquina.direccionipprivadav4 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												direccionipprivadav4: e.target.value,
											})
										}
									/>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-xs outline-none focus:bg-white"
										placeholder="IP Pública"
										defaultValue={maquina.direccionippublicav4 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												direccionippublicav4: e.target.value,
											})
										}
									/>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-xs outline-none focus:bg-white"
										placeholder="Gateway"
										defaultValue={maquina.puertaenlacev4 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												puertaenlacev4: e.target.value,
											})
										}
									/>
								</div>

								<div className="space-y-4">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-slate-900 pl-4 italic">
										IPv6
									</h3>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-[10px] outline-none focus:bg-white"
										placeholder="IP Privada"
										defaultValue={maquina.direccionipprivadav6 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												direccionipprivadav6: e.target.value,
											})
										}
									/>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-[10px] outline-none focus:bg-white"
										placeholder="IP Pública"
										defaultValue={maquina.direccionippublicav6 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												direccionippublicav6: e.target.value,
											})
										}
									/>
									{/* CAMPO GATEWAY IPv6 REINSTAURADO EN EDICIÓN */}
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-mono text-[10px] outline-none focus:bg-white"
										placeholder="Gateway IPv6"
										defaultValue={maquina.puertaenlacev6 || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												puertaenlacev6: e.target.value,
											})
										}
									/>
								</div>

								<div className="space-y-4">
									<h3 className="text-[11px] font-black uppercase text-slate-900 border-l-4 border-emerald-500 pl-4 italic">
										Seguridad
									</h3>
									<input
										className="w-full bg-slate-50 rounded-xl p-4 font-bold text-xs"
										placeholder="Emisor SSL"
										defaultValue={maquina.emisorssl || ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												emisorssl: e.target.value,
											})
										}
									/>
									<div className="grid grid-cols-2 gap-4">
										<label className="flex items-center justify-center gap-2 bg-slate-50 p-4 rounded-xl cursor-pointer">
											<input
												type="checkbox"
												className="accent-blue-600"
												defaultChecked={maquina.certificadosslactivo}
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
										<label className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl cursor-pointer">
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
								className="w-full bg-slate-900 text-white py-10 rounded-[2.5rem] font-black text-[14px] uppercase tracking-[0.6em] hover:bg-blue-600 transition-all shadow-2xl active:scale-[0.98]"
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
