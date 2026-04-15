"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- Interfaces ---
interface Dispositivo {
	iddispositivo: number;
	uuiddispositivo: string;
	nombre: string;
	puntomontaje: string;
	capacidad: number;
	capacidadusada: number;
	tecnologia: string;
	idmaquina: number;
	tipo_dispositivo_nombre: string;
}

// --- Mapeo de Iconos Mejorado ---
const getDeviceIcon = (tipo: string) => {
	const t = tipo.toLowerCase();
	if (t.includes("ssd") || t.includes("hdd")) return "💾";
	if (t.includes("nas") || t.includes("server")) return "🗄️";
	if (t.includes("cinta")) return "📼";
	if (t.includes("pendrive") || t.includes("dongle")) return "🔌";
	if (t.includes("disquetera")) return "💾";
	if (t.includes("cable") || t.includes("transceptor")) return "🧶";
	if (
		t.includes("switch") ||
		t.includes("router") ||
		t.includes("bridge") ||
		t.includes("point")
	)
		return "🌐";
	if (t.includes("cámara")) return "📷";
	if (t.includes("escáner") || t.includes("qr")) return "🔍";
	if (t.includes("monitor")) return "🖥️";
	if (t.includes("térmica")) return "🖨️";
	if (t.includes("sai") || t.includes("pdu")) return "⚡";
	if (t.includes("kvm")) return "⌨️";
	if (t.includes("raspberry")) return "🍓";
	if (t.includes("docking")) return "⚓";
	return "📦"; // Icono por defecto
};

export default function DispositivosPage() {
	const router = useRouter();
	const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const limit = 10;

	const fetchDispositivos = async (nombre = "") => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
			const url = new URL(`${apiUrl}/api/dispositivos`);
			url.searchParams.append("page", page.toString());
			url.searchParams.append("limit", limit.toString());
			if (nombre) url.searchParams.append("filtroNombre", nombre);

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al obtener dispositivos");
			const data = await res.json();
			setDispositivos(Array.isArray(data.info) ? data.info : []);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const delayDebounceFn = setTimeout(
			() => fetchDispositivos(searchTerm),
			500,
		);
		return () => clearTimeout(delayDebounceFn);
	}, [searchTerm, page]);

	const calculatePorcentaje = (usado: number, total: number) => {
		if (!total || total === 0) return 0;
		return Math.min(Math.round((usado / total) * 100), 100);
	};

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-6xl mx-auto">
				{/* CABECERA */}
				<div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
					<div>
						<h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
							Dispositivos <span className="text-blue-600">.</span>
						</h1>
						<p className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase mt-2">
							Infraestructura y Almacenamiento
						</p>
					</div>
					<div className="flex items-center gap-4 w-full md:w-auto">
						<div className="relative flex-1 md:w-80 group">
							<input
								type="text"
								placeholder="BUSCAR DISPOSITIVO..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full bg-white border-2 border-slate-950 p-5 pl-14 rounded-3xl text-xs font-black text-slate-950 tracking-[0.2em] outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-50 transition-all shadow-md placeholder:text-slate-400"
							/>
							<span className="absolute left-5 top-4 text-slate-300">🔍</span>
						</div>
						<button
							onClick={() => router.push("/dashboard/dispositivos/nuevo")}
							className="bg-slate-900 text-white p-4 px-8 rounded-3xl font-black text-[10px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95 border-b-4 border-black"
						>
							+ AÑADIR
						</button>
					</div>
				</div>

				{/* LISTADO */}
				{loading && dispositivos.length === 0 ? (
					<div className="h-64 flex items-center justify-center font-black text-slate-300 text-xs tracking-[0.5em] animate-pulse uppercase">
						Sincronizando...
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6">
						{dispositivos.map((disp) => {
							const porcentaje = calculatePorcentaje(
								disp.capacidadusada,
								disp.capacidad,
							);
							const isNetwork = ["switch", "router", "ap", "cable"].some(
								(key) =>
									disp.tipo_dispositivo_nombre.toLowerCase().includes(key),
							);

							return (
								<div
									key={disp.uuiddispositivo}
									onClick={() =>
										router.push(
											`/dashboard/dispositivos/${disp.uuiddispositivo}`,
										)
									}
									className="group bg-white border border-white p-6 md:p-8 rounded-[3rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col md:flex-row items-center gap-8"
								>
									{/* Icono Dinámico */}
									<div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors border-2 border-transparent group-hover:border-blue-100">
										<span className="text-3xl group-hover:scale-125 transition-transform duration-500">
											{getDeviceIcon(disp.tipo_dispositivo_nombre)}
										</span>
									</div>

									{/* Info Principal */}
									<div className="flex-1 text-center md:text-left">
										<div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
											<h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
												{disp.nombre}
											</h3>
											<span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-100">
												{disp.tipo_dispositivo_nombre}
											</span>
										</div>
										<p className="text-[10px] font-mono font-bold text-slate-400">
											{disp.tecnologia} •{" "}
											<span className="text-slate-900">
												{disp.puntomontaje || "SIN PUNTO DE MONTAJE"}
											</span>
										</p>
									</div>

									{/* Barra de Capacidad (Solo si tiene capacidad definida) */}
									{!isNetwork && disp.capacidad > 0 ? (
										<div className="w-full md:w-64 space-y-3 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-50">
											<div className="flex justify-between items-end">
												<span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
													Uso Almacén
												</span>
												<span
													className={`text-[10px] font-black ${porcentaje > 85 ? "text-red-500" : "text-slate-800"}`}
												>
													{porcentaje}%
												</span>
											</div>
											<div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
												<div
													className={`h-full rounded-full transition-all duration-1000 ${porcentaje > 85 ? "bg-red-500" : "bg-blue-600"}`}
													style={{ width: `${porcentaje}%` }}
												></div>
											</div>
										</div>
									) : (
										<div className="w-full md:w-64 flex justify-center md:justify-end">
											<span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 px-6 py-3 rounded-2xl">
												Dispositivo de Red
											</span>
										</div>
									)}

									<div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pr-4">
										<span className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-full text-sm">
											→
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* PAGINACIÓN */}
				<div className="flex justify-center mt-16 gap-4">
					<button
						disabled={page === 1}
						onClick={() => setPage((p) => p - 1)}
						className="p-4 px-10 rounded-2xl bg-white border border-slate-200 text-[10px] font-black tracking-widest disabled:opacity-30 hover:bg-slate-50 transition-all uppercase"
					>
						Anterior
					</button>
					<button
						disabled={dispositivos.length < limit}
						onClick={() => setPage((p) => p + 1)}
						className="p-4 px-10 rounded-2xl bg-slate-900 text-white text-[10px] font-black tracking-widest disabled:opacity-30 hover:bg-black transition-all uppercase"
					>
						Siguiente
					</button>
				</div>
			</div>
		</div>
	);
}
