"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Maquina {
	idmaquina: number;
	nombre: string;
	uuidmaquina: string;
	direccionipprivadav4: string;
	sistemaoperativo: string;
	esservidor: boolean;
}

export default function SeleccionCalendarioPage() {
	const router = useRouter();
	const [maquinas, setMaquinas] = useState<Maquina[]>([]);
	const [busqueda, setBusqueda] = useState("");
	const [loading, setLoading] = useState(true);

	// 1. Obtener permisos del localStorage
	const permisos = useMemo(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("permisos") || "[]");
		} catch {
			return [];
		}
	}, []);

	const tieneAccesoTotal =
		permisos.includes("admin:total") ||
		permisos.includes("calendar:getAllEventos");

	useEffect(() => {
		const fetchMaquinas = async () => {
			setLoading(true);
			const token = localStorage.getItem("token");
			const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
			const headers = { Authorization: `Bearer ${token}` };

			try {
				if (tieneAccesoTotal) {
					// CASO 1: ACCESO TOTAL -> Carga masiva
					const res = await fetch(
						`${baseUrl}/api/maquina?soloServidores=true`,
						{ headers },
					);
					const data = await res.json();
					setMaquinas(Array.isArray(data) ? data : []);
				} else {
					// CASO 2: ACCESO RESTRINGIDO
					// Primero obtenemos la lista de UUIDs permitidos
					const resPermitidas = await fetch(
						`${baseUrl}/api/reservas/maquinasVerReserva`,
						{ headers },
					);
					const dataPermitidas = await resPermitidas.json();
					const uuidsAutorizados: string[] = dataPermitidas.uuidMaquinas || [];

					// Para cada UUID, pedimos su información específica para poder pintar la tarjeta
					const promesasMaquinas = uuidsAutorizados.map((uuid) =>
						fetch(`${baseUrl}/api/maquina/${uuid}`, { headers })
							.then((res) => res.json())
							.then((data) => data.info) // Extraemos la propiedad .info de la respuesta
							.catch(() => null),
					);

					const resultados = await Promise.all(promesasMaquinas);
					// Filtramos nulos y nos aseguramos de que solo mostramos servidores
					const maquinasValidas = resultados.filter(
						(m): m is Maquina => m !== null && m.esservidor,
					);
					setMaquinas(maquinasValidas);
				}
			} catch (error) {
				console.error("Error en la sincronización de infraestructura:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchMaquinas();
	}, [tieneAccesoTotal]);

	// Filtrado por búsqueda en cliente
	const maquinasFiltradas = useMemo(() => {
		return maquinas.filter(
			(m) =>
				m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
				m.direccionipprivadav4.includes(busqueda),
		);
	}, [maquinas, busqueda]);

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">
						Sincronizando Nodos...
					</p>
				</div>
			</div>
		);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-16 px-8 font-sans">
			<div className="max-w-6xl mx-auto">
				{/* HEADER */}
				<header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-slate-100 pb-12">
					<div>
						<p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3 italic">
							Infraestructura // Calendarios
						</p>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Gestión de <br />
							<span className="text-blue-600 italic">Eventos</span>
						</h1>
					</div>

					<div className="relative w-full md:w-80">
						<input
							type="text"
							placeholder="FILTRAR NODO..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="w-full bg-slate-100 border-none rounded-2xl p-5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 uppercase text-[10px] tracking-widest shadow-inner"
						/>
					</div>
				</header>

				{/* GRID DE SERVIDORES */}
				{maquinasFiltradas.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{maquinasFiltradas.map((maq) => (
							<button
								key={maq.uuidmaquina}
								onClick={() =>
									router.push(`/dashboard/calendario/${maq.uuidmaquina}`)
								}
								className="group bg-white border border-slate-100 p-10 rounded-[3rem] text-left hover:bg-slate-900 transition-all duration-500 shadow-xl shadow-slate-200/40 hover:shadow-blue-900/30 relative overflow-hidden"
							>
								{/* Indicador de ID de fondo */}
								<div className="absolute -right-2 -top-2 text-slate-50 group-hover:text-white/5 transition-colors font-black text-9xl italic leading-none pointer-events-none">
									{maq.idmaquina}
								</div>

								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-8">
										<div className="w-2 h-2 rounded-full bg-blue-500 group-hover:bg-blue-400 group-hover:animate-pulse" />
										<span className="text-[9px] font-black text-slate-400 group-hover:text-blue-400 uppercase tracking-widest transition-colors">
											Status: Online
										</span>
									</div>

									<h3 className="text-3xl font-black text-slate-900 group-hover:text-white uppercase tracking-tighter mb-2 transition-colors">
										{maq.nombre}
									</h3>
									<p className="font-mono text-sm font-bold text-blue-600 group-hover:text-blue-300 transition-colors mb-10">
										{maq.direccionipprivadav4}
									</p>

									<div className="flex items-center justify-between pt-8 border-t border-slate-50 group-hover:border-white/10 transition-colors">
										<span className="text-[9px] font-black text-slate-300 group-hover:text-white/40 uppercase tracking-widest">
											{maq.sistemaoperativo || "SYSTEM NODE"}
										</span>
										<div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center transition-all group-hover:rotate-45">
											<span className="text-slate-900 group-hover:text-white font-black">
												→
											</span>
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
				) : (
					<div className="bg-white rounded-[4rem] p-32 text-center border-2 border-dashed border-slate-200">
						<div className="text-6xl mb-6">🛰️</div>
						<p className="text-slate-300 font-black uppercase tracking-[0.3em] italic text-xs">
							No se han detectado nodos bajo este criterio
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
