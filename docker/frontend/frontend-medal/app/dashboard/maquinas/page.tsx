"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth-common";

interface Maquina {
	idmaquina: number;
	uuidmaquina: string;
	nombre: string;
	sistemaoperativo: string;
	direccionippublicav4: string | null;
	direccionipprivadav4: string | null;
	ram: number;
	esservidor: boolean;
	certificadosslactivo: boolean;
	caducidadssl: string | null;
}

export default function MachineListingPage() {
	const router = useRouter();

	// Estados de datos
	const [machines, setMachines] = useState<Maquina[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	// Estados de paginación
	const [page, setPage] = useState(1);
	const limit = 5;

	// --- GESTIÓN DE PERMISOS ---
	const [userPerms, setUserPerms] = useState<string[]>([]);

	useEffect(() => {
		const stored = localStorage.getItem("permisos");
		if (stored) {
			const parsed = JSON.parse(stored);
			setUserPerms(parsed);

			const canAccess =
				parsed.includes("admin:total") ||
				parsed.includes("maq:getAll") ||
				parsed.includes("maq:getServer");

			if (!canAccess) router.push("/dashboard");
		} else {
			logout();
		}
	}, [router]);

	const canCreate =
		userPerms.includes("admin:total") || userPerms.includes("maq:postMaquina");

	// --- FETCH DATA ---
	const fetchMachines = useCallback(async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/maquina`);
			url.searchParams.append("page", page.toString());
			url.searchParams.append("limit", limit.toString());
			if (searchTerm) url.searchParams.append("filtroNombre", searchTerm);

			const res = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (res.status === 401) logout();

			const data = await res.json();
			if (res.ok) {
				setMachines(data);
			} else {
				setMachines([]); // Manejo de 404 cuando no hay filtros
			}
		} catch (e) {
			console.error("Error fetching machines:", e);
		} finally {
			setLoading(false);
		}
	}, [page, searchTerm]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			fetchMachines();
		}, 300); // Debounce para no saturar la API al escribir

		return () => clearTimeout(delayDebounceFn);
	}, [fetchMachines]);

	return (
		<div className="min-h-screen bg-[#F8FAFC] py-12 px-6">
			<div className="max-w-7xl mx-auto">
				{/* HEADER SECCIÓN */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
					<div className="space-y-4">
						<p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">
							Infraestructura Global
						</p>
						<h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">
							Inventario <br />{" "}
							<span className="text-slate-300">de Máquinas</span>
						</h1>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
						{/* BUSCADOR */}
						<div className="relative group">
							<input
								type="text"
								placeholder="FILTRAR POR NOMBRE..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPage(1);
								}}
								className="bg-white border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-blue-500 transition-all w-full md:w-72 shadow-sm"
							/>
							<div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={3}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
						</div>

						{/* BOTÓN CREAR */}
						{canCreate && (
							<button
								onClick={() => router.push("/dashboard/maquinas/nuevo")}
								className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] tracking-[0.2em] uppercase shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
							>
								<span>+</span> Añadir Máquina
							</button>
						)}
					</div>
				</div>

				{/* GRID DE MÁQUINAS */}
				{loading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{[...Array(4)].map((_, i) => (
							<div
								key={i}
								className="h-64 bg-slate-100 rounded-[3rem] animate-pulse"
							></div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{machines.length > 0 ? (
							machines.map((maquina) => (
								<div
									key={maquina.uuidmaquina}
									onClick={() =>
										router.push(`/dashboard/maquinas/${maquina.uuidmaquina}`)
									}
									className="bg-white border border-white p-8 rounded-[3.5rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer group flex flex-col justify-between min-h-[320px]"
								>
									<div>
										<div className="flex justify-between items-start mb-6">
											<div
												className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${maquina.esservidor ? "bg-indigo-50 text-indigo-500" : "bg-slate-50 text-slate-400"}`}
											>
												{maquina.esservidor ? "🖥️" : "💻"}
											</div>
											{maquina.certificadosslactivo ? (
												<span className="bg-emerald-50 text-emerald-500 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-100">
													SSL Safe
												</span>
											) : (
												<span className="bg-red-50 text-red-500 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-red-100">
													No SSL
												</span>
											)}
										</div>

										<h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-1 truncate group-hover:text-blue-600 transition-colors">
											{maquina.nombre}
										</h3>
										<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 italic">
											{maquina.sistemaoperativo}
										</p>

										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
												<span className="text-[10px] font-black text-slate-600">
													{maquina.direccionippublicav4 || "Sin IP Pública"}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
												<span className="text-[10px] font-bold text-slate-400 font-mono">
													{maquina.direccionipprivadav4 || "Local: -"}
												</span>
											</div>
										</div>
									</div>

									<div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
										<div className="flex flex-col">
											<span className="text-[18px] font-black text-slate-900 leading-none">
												{maquina.ram}GB
											</span>
											<span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
												Memoria Ram
											</span>
										</div>
										<div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={3}
													d="M14 5l7 7m0 0l-7 7m7-7H3"
												/>
											</svg>
										</div>
									</div>
								</div>
							))
						) : (
							<div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
								<p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
									No se han detectado activos de red
								</p>
							</div>
						)}
					</div>
				)}

				{/* PAGINACIÓN */}
				<div className="mt-16 flex justify-center items-center gap-8">
					<button
						disabled={page === 1}
						onClick={() => setPage((p) => p - 1)}
						className="p-5 bg-white rounded-full shadow-lg text-slate-900 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all border border-slate-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={3}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
					<span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">
						Página {page}
					</span>
					<button
						disabled={machines.length < limit}
						onClick={() => setPage((p) => p + 1)}
						className="p-5 bg-white rounded-full shadow-lg text-slate-900 disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all border border-slate-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={3}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
