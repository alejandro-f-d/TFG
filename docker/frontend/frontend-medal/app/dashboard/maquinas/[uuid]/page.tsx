"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";
import BackButton from "@/components/backButton/BackButton";

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
	const params = useParams();
	const uuid = params?.uuid as string;
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
		if (!uuid) return;
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
				// Manejar si info es string (sin reservas) o array
				setReservas(Array.isArray(dataRes.info) ? dataRes.info : []);
			}

			if (resServ.ok) {
				const dataServ = await resServ.json();
				setServicios(dataServ.info?.data || dataServ.info || []);
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
			// Filtramos campos que no deben ir en el PATCH
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
			<div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center font-black uppercase text-slate-900 text-xs tracking-[0.5em] animate-pulse">
				Sincronizando Activo...
			</div>
		);

	if (!maquina)
		return (
			<div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center font-black uppercase text-red-600">
				Activo no encontrado
			</div>
		);

	const labelClass =
		"text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1";
	const valueClass = "text-sm font-black text-slate-950 uppercase";

	return (
		<div className="min-h-screen bg-[#F1F5F9] py-12 px-6">
			<style jsx global>{`
				.custom-scrollbar::-webkit-scrollbar { width: 8px; }
				.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
				.custom-scrollbar::-webkit-scrollbar-thumb { background: #0f172a; border-radius: 10px; }
			`}</style>

			<div className="max-w-7xl mx-auto">
				{/* BARRA SUPERIOR */}
				<div className="flex justify-between items-center mb-12">
					<div className="mb-6">
						<BackButton />
					</div>
					<div className="flex items-center gap-4">
						{canDelete && (
							<button
								onClick={() => setShowDeleteAlert(true)}
								className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
							>
								Eliminar
							</button>
						)}
						{canEdit && (
							<button
								onClick={() => setIsEditingMachine(true)}
								className="bg-slate-950 text-white px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95 border-b-4 border-black"
							>
								Editar Activo
							</button>
						)}
					</div>
				</div>

				{/* HEADER PRINCIPAL */}
				<div className="mb-16">
					<h1 className="text-8xl font-black text-slate-950 tracking-tighter uppercase leading-[0.85] break-all drop-shadow-sm">
						{maquina.nombre}
					</h1>
					<div className="inline-flex items-center gap-4 bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl mt-6 shadow-sm">
						<span
							className={`w-3 h-3 rounded-full ${maquina.esservidor ? "bg-blue-600" : "bg-emerald-500"} animate-pulse`}
						></span>
						<p className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em]">
							{maquina.sistemaoperativo}{" "}
							<span className="mx-2 text-slate-300">|</span> {maquina.ram}GB RAM{" "}
							<span className="mx-2 text-slate-300">|</span>{" "}
							{maquina.esservidor ? "SERVER MODE" : "WORKSTATION"}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
					{/* COL 1: STACK DE RED */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border-b-8 border-blue-900">
							<div className="absolute top-0 right-0 p-6 opacity-10 text-9xl font-black italic pointer-events-none text-blue-500">
								v4
							</div>
							<h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-10 italic relative z-10">
								IPv4 Stack Configuration
							</h2>
							<div className="space-y-8 relative z-10">
								{[
									{
										label: "IP Privada Principal",
										key: "direccionipprivadav4",
										color: "text-white",
									},
									{
										label: "Dirección IP Pública",
										key: "direccionippublicav4",
										color: "text-emerald-400",
									},
									{
										label: "Gateway v4",
										key: "puertaenlacev4",
										color: "text-blue-300",
									},
								].map((item) => (
									<div
										key={item.key}
										className="border-l-2 border-slate-800 pl-6"
									>
										<p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">
											{item.label}
										</p>
										<p
											className={`font-mono text-base font-bold ${item.color}`}
										>
											{(maquina as any)[item.key] || "NON_CONFIGURED"}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-xl relative overflow-hidden">
							<div className="absolute top-0 right-0 p-6 opacity-5 text-9xl font-black italic pointer-events-none text-slate-900">
								v6
							</div>
							<h2 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.4em] mb-10 italic">
								IPv6 Stack Configuration
							</h2>
							<div className="space-y-8 relative z-10">
								{[
									{ label: "Private v6", key: "direccionipprivadav6" },
									{ label: "Public v6", key: "direccionippublicav6" },
									{ label: "Gateway v6", key: "puertaenlacev6" },
								].map((item) => (
									<div
										key={item.key}
										className="border-l-2 border-slate-100 pl-6"
									>
										<p className={labelClass}>{item.label}</p>
										<p className="font-mono text-xs font-black text-slate-900 break-all leading-relaxed">
											{(maquina as any)[item.key] || "UNSET"}
										</p>
									</div>
								))}
							</div>
						</div>

						<div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-xl relative overflow-hidden">
							<div
								className={`absolute top-0 right-0 w-3 h-full ${maquina.certificadosslactivo ? "bg-emerald-500" : "bg-red-500"}`}
							></div>
							<h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic">
								Seguridad TLS/SSL
							</h2>
							<div className="space-y-8">
								<div
									className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border-2 ${maquina.certificadosslactivo ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"}`}
								>
									<div
										className={`w-2 h-2 rounded-full ${maquina.certificadosslactivo ? "bg-emerald-600 animate-pulse" : "bg-red-600"}`}
									></div>
									<span className="text-[10px] font-black uppercase tracking-widest">
										{maquina.certificadosslactivo
											? "Encriptación Activa"
											: "Vulnerable / Sin SSL"}
									</span>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className={labelClass}>Emisor</p>
										<p className={valueClass}>{maquina.emisorssl || "N/A"}</p>
									</div>
									<div>
										<p className={labelClass}>Caducidad</p>
										<p className="text-sm font-mono text-blue-700 font-black">
											{maquina.caducidadssl
												? new Date(maquina.caducidadssl).toLocaleDateString()
												: "EXPIRED"}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* COL 2: HARDWARE Y SERVICIOS */}
					<div className="lg:col-span-4 space-y-10">
						<div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-xl">
							<h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 italic">
								Unidades de Almacenamiento
							</h2>
							{maquina.dispositivos.length > 0 ? (
								<div className="space-y-4">
									{maquina.dispositivos.map((d) => (
										<div
											key={d.uuiddispositivo}
											className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 group hover:border-blue-600 transition-all"
										>
											<span className="text-[11px] font-black uppercase text-slate-950">
												{d.nombre}
											</span>
											<span className="text-[11px] font-mono text-white bg-slate-950 px-4 py-1.5 rounded-xl font-bold border-b-4 border-blue-700">
												{d.capacidad}GB
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="py-12 border-4 border-dashed border-slate-100 rounded-[2.5rem] text-center">
									<p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
										No Hardware detected
									</p>
								</div>
							)}
						</div>

						<div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-200 shadow-xl">
							<h2 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.4em] mb-10 italic">
								Servicios en Ejecución
							</h2>
							{servicios.length > 0 ? (
								<div className="space-y-4">
									{servicios.map((s) => (
										<button
											key={s.uuidservicio}
											onClick={() =>
												router.push(`/dashboard/servicios/${s.uuidservicio}`)
											}
											className="w-full text-left p-6 rounded-[2.5rem] bg-white border-2 border-slate-200 hover:border-blue-700 hover:shadow-lg transition-all group active:scale-95 border-b-4"
										>
											<h3 className="text-[12px] font-black uppercase text-slate-950 group-hover:text-blue-700 mb-1">
												{s.nombreservicio}
											</h3>
											<p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
												{s.softwarebase}
											</p>
										</button>
									))}
								</div>
							) : (
								<p className="text-[10px] font-black text-slate-400 uppercase text-center py-6">
									0 Procesos activos
								</p>
							)}
						</div>
					</div>

					{/* COL 3: RESERVAS (Timeline) */}
					<div className="lg:col-span-4">
						<div className="bg-blue-700 p-10 rounded-[3.5rem] text-white shadow-2xl min-h-[500px] border-b-[12px] border-blue-900 relative">
							<h2 className="text-[11px] font-black text-blue-200 uppercase tracking-[0.4em] mb-10 italic">
								Timeline de Reservas
							</h2>
							{reservas.length > 0 ? (
								<div className="space-y-5">
									{reservas.map((r) => (
										<button
											key={r.uuidcalendario}
											onClick={() => router.push(`/dashboard/reserva/${uuid}`)}
											className="w-full text-left p-8 rounded-[2.5rem] bg-blue-800/50 hover:bg-white hover:text-blue-800 transition-all relative overflow-hidden group shadow-lg"
										>
											<h4 className="text-sm font-black uppercase mb-2 leading-tight">
												{r.nombre_reserva}
											</h4>
											<div className="h-[2px] w-8 bg-blue-400 group-hover:bg-blue-800 mb-3 transition-colors"></div>
											<p className="text-[9px] font-black uppercase tracking-widest opacity-70">
												RESP: {r.nombre_completo_responsable}
											</p>
										</button>
									))}
								</div>
							) : (
								<div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center px-10">
									<div className="text-6xl mb-4">📅</div>
									<p className="text-[11px] font-black uppercase tracking-[0.5em]">
										System available
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* MODAL BORRADO */}
			{showDeleteAlert && (
				<div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
					<div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl text-center border-2 border-red-500">
						<div className="w-24 h-24 bg-red-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-red-600 text-5xl font-black shadow-inner">
							!
						</div>
						<h3 className="text-3xl font-black uppercase tracking-tighter text-slate-950 mb-4">
							Eliminar Activo
						</h3>
						<p className="text-slate-500 text-[11px] font-black uppercase mb-10 tracking-widest leading-relaxed">
							Esta operación purgará{" "}
							<span className="text-red-600 underline">{maquina.nombre}</span>{" "}
							del nodo central de forma irreversible.
						</p>
						<div className="flex flex-col gap-4">
							<button
								onClick={handleDeleteMachine}
								disabled={isDeleting}
								className={`w-full py-7 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all border-b-8 ${isDeleting ? "bg-slate-200 text-slate-400 border-slate-300" : "bg-red-600 text-white border-red-800 hover:bg-red-700 shadow-xl"}`}
							>
								{isDeleting ? "BORRANDO..." : "CONFIRMAR PURGA"}
							</button>
							<button
								onClick={() => setShowDeleteAlert(false)}
								className="w-full py-4 rounded-2xl font-black text-[11px] uppercase text-slate-400 hover:text-slate-950 transition-colors"
							>
								Abortar operación
							</button>
						</div>
					</div>
				</div>
			)}

			{/* MODAL EDICIÓN */}
			{isEditingMachine && (
				<div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-10">
					<div className="bg-[#F1F5F9] w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border-2 border-slate-300">
						<div className="bg-white px-12 lg:px-16 pt-12 pb-10 flex justify-between items-center border-b-4 border-slate-200">
							<h2 className="text-5xl font-black uppercase tracking-tighter text-slate-950">
								Sincronizar <span className="text-blue-700">Activo</span>
							</h2>
							<button
								onClick={() => setIsEditingMachine(false)}
								className="text-[11px] font-black uppercase text-slate-500 bg-slate-100 px-8 py-4 rounded-full italic hover:bg-red-50 hover:text-red-600 transition-all border-2 border-transparent hover:border-red-200"
							>
								[ CANCELAR ]
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-12 lg:px-16 py-12 custom-scrollbar">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
								{/* INFO BASE */}
								<div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white p-12 rounded-[3.5rem] border-2 border-slate-200 shadow-sm">
									{[
										{
											label: "Hostname / Identificador",
											key: "nombre",
											type: "text",
										},
										{
											label: "Sistema Operativo",
											key: "sistemaoperativo",
											type: "text",
										},
										{ label: "RAM Asignada (GB)", key: "ram", type: "number" },
									].map((f) => (
										<div key={f.key} className="flex flex-col gap-3">
											<label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">
												{f.label}
											</label>
											<input
												type={f.type}
												className="bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] p-6 font-black text-slate-950 text-base outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-50 transition-all"
												value={(machineForm as any)[f.key] ?? ""}
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
								<div className="space-y-6 bg-white p-10 rounded-[3.5rem] border-2 border-slate-200">
									<h3 className="text-[12px] font-black uppercase text-slate-950 border-l-8 border-blue-700 pl-4 italic mb-8">
										IPv4 Configuration
									</h3>
									{[
										"direccionipprivadav4",
										"direccionippublicav4",
										"puertaenlacev4",
									].map((key) => (
										<div key={key}>
											<label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block">
												{key.includes("privada")
													? "IP PRIVADA"
													: key.includes("publica")
														? "IP PÚBLICA"
														: "GATEWAY"}
											</label>
											<input
												className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-mono text-sm font-bold text-slate-950 focus:border-blue-700 outline-none transition-all"
												value={(machineForm as any)[key] ?? ""}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														[key]: e.target.value,
													})
												}
											/>
										</div>
									))}
								</div>

								{/* IPv6 Stack */}
								<div className="space-y-6 bg-white p-10 rounded-[3.5rem] border-2 border-slate-200">
									<h3 className="text-[12px] font-black uppercase text-slate-950 border-l-8 border-slate-400 pl-4 italic mb-8">
										IPv6 Configuration
									</h3>
									{[
										"direccionipprivadav6",
										"direccionippublicav6",
										"puertaenlacev6",
									].map((key) => (
										<div key={key}>
											<label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block">
												v6{" "}
												{key.includes("privada")
													? "PRIV"
													: key.includes("publica")
														? "PUB"
														: "GW"}
											</label>
											<input
												className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-mono text-[11px] font-bold text-slate-950 focus:border-slate-950 outline-none transition-all"
												value={(machineForm as any)[key] ?? ""}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														[key]: e.target.value,
													})
												}
											/>
										</div>
									))}
								</div>

								{/* Seguridad */}
								<div className="space-y-6 bg-white p-10 rounded-[3.5rem] border-2 border-slate-200">
									<h3 className="text-[12px] font-black uppercase text-slate-950 border-l-8 border-emerald-500 pl-4 italic mb-8">
										Security & Role
									</h3>
									<input
										className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-xs text-slate-950 focus:border-emerald-500 outline-none"
										placeholder="EMISOR SSL"
										value={machineForm.emisorssl ?? ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												emisorssl: e.target.value,
											})
										}
									/>
									<input
										type="date"
										className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-black text-xs text-slate-950 focus:border-emerald-500 outline-none"
										value={machineForm.caducidadssl?.split("T")[0] ?? ""}
										onChange={(e) =>
											setMachineForm({
												...machineForm,
												caducidadssl: e.target.value,
											})
										}
									/>
									<div className="grid grid-cols-2 gap-4">
										<label
											className={`flex items-center justify-center gap-3 p-5 rounded-2xl cursor-pointer transition-all border-4 ${machineForm.certificadosslactivo ? "bg-emerald-50 border-emerald-400 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}
										>
											<input
												type="checkbox"
												className="w-5 h-5 accent-emerald-600"
												checked={machineForm.certificadosslactivo || false}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														certificadosslactivo: e.target.checked,
													})
												}
											/>
											<span className="text-[11px] font-black uppercase">
												SSL
											</span>
										</label>
										<label
											className={`flex items-center justify-center gap-3 p-5 rounded-2xl cursor-pointer transition-all border-4 ${machineForm.esservidor ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-50 border-slate-200 text-slate-400"}`}
										>
											<input
												type="checkbox"
												className="w-5 h-5 accent-white"
												checked={machineForm.esservidor || false}
												onChange={(e) =>
													setMachineForm({
														...machineForm,
														esservidor: e.target.checked,
													})
												}
											/>
											<span className="text-[11px] font-black uppercase">
												SERVER
											</span>
										</label>
									</div>
								</div>
							</div>
						</div>
						<div className="p-12 bg-white border-t-4 border-slate-200 shadow-inner">
							<button
								onClick={handleUpdateMachine}
								className="w-full bg-slate-950 text-white py-12 rounded-[3rem] font-black text-2xl uppercase tracking-[0.8em] hover:bg-blue-700 transition-all shadow-2xl active:scale-[0.98] border-b-[12px] border-black"
							>
								Confirmar Sincronización
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
