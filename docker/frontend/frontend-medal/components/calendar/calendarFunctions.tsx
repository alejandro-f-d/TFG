"use client";

import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventSourceFunc, EventClickArg } from "@fullcalendar/core";

// --- INTERFACES ---
interface ReservaDetalle {
	uuidcalendario: string;
	nombre_reserva: string;
	descripcion: string;
	fechainicio: string;
	fechafin: string;
	nombre_maquina: string;
	uuid_responsable: string;
	nombre_completo_responsable: string;
}

interface CalendarProps {
	maquinaUuid: string;
	onMachineNameLoaded?: (name: string) => void;
}

const EVENT_COLORS = [
	"#1e40af",
	"#166534",
	"#92400e",
	"#991b1b",
	"#6b21a8",
	"#831843",
	"#0e7490",
	"#374151",
];

export default function CalendarFunctions({
	maquinaUuid,
	onMachineNameLoaded,
}: CalendarProps) {
	const [selectedReserva, setSelectedReserva] = useState<ReservaDetalle | null>(
		null,
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const calendarRef = useRef<FullCalendar>(null);

	const [form, setForm] = useState({
		nombre: "",
		descripcion: "",
		fechainicio: "",
		fechafin: "",
	});

	const getColorFromUuid = (uuid: string) => {
		if (!uuid) return EVENT_COLORS[0];
		let hash = 0;
		for (let i = 0; i < uuid.length; i++) {
			hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % EVENT_COLORS.length;
		return EVENT_COLORS[index];
	};

	const formatToLocalInput = (dateStr: string) => {
		if (!dateStr) return "";
		const date = new Date(dateStr);
		const offset = date.getTimezoneOffset() * 60000;
		return new Date(date.getTime() - offset).toISOString().slice(0, 16);
	};

	useEffect(() => {
		const interval = setInterval(() => {
			calendarRef.current?.getApi().refetchEvents();
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const fetchEvents: EventSourceFunc = async (
		info,
		successCallback,
		failureCallback,
	) => {
		try {
			const token = localStorage.getItem("token");
			const url = new URL(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${maquinaUuid}/reserva`,
			);
			url.searchParams.append("fechaInicio", info.start.toISOString());
			url.searchParams.append("fechaFin", info.end.toISOString());

			const response = await fetch(url.toString(), {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await response.json();

			if (response.ok) {
				if (typeof data.info === "string") {
					onMachineNameLoaded?.(data.info);
					successCallback([]);
					return;
				}

				if (Array.isArray(data.info)) {
					if (data.info.length > 0) {
						onMachineNameLoaded?.(data.info[0].nombre_maquina);
					}

					const events = data.info.map((r: any) => {
						const userColor = getColorFromUuid(r.uuid_responsable);
						return {
							id: r.uuidcalendario,
							title: r.nombre_reserva,
							start: r.fechainicio,
							end: r.fechafin,
							backgroundColor: userColor,
							borderColor: userColor,
							display: "block",
							extendedProps: {
								responsable_nombre: r.nombre_completo_responsable,
							},
						};
					});
					successCallback(events);
				} else {
					successCallback([]);
				}
			} else {
				successCallback([]);
			}
		} catch (error) {
			console.error("Error fetching events:", error);
			failureCallback(error as Error);
		}
	};

	const handleCreate = async () => {
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/maquina/${maquinaUuid}/reserva`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						nombre: form.nombre,
						descripcion: form.descripcion,
						fechaInicio: new Date(form.fechainicio).toISOString(),
						fechaFin: new Date(form.fechafin).toISOString(),
					}),
				},
			);
			if (response.ok) {
				setIsCreating(false);
				calendarRef.current?.getApi().refetchEvents();
			} else {
				const err = await response.json();
				alert(err.error || "Error al crear");
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleUpdate = async () => {
		if (!selectedReserva) return;
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/reservas/${selectedReserva.uuidcalendario}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						nombre: form.nombre,
						descripcion: form.descripcion,
						fechainicio: new Date(form.fechainicio).toISOString(),
						fechafin: new Date(form.fechafin).toISOString(),
					}),
				},
			);
			if (response.ok) {
				setIsEditing(false);
				setIsModalOpen(false);
				calendarRef.current?.getApi().refetchEvents();
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleDelete = async () => {
		if (!selectedReserva || !confirm("¿Eliminar reserva?")) return;
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/reservas/${selectedReserva.uuidcalendario}`,
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (response.ok) {
				setIsModalOpen(false);
				calendarRef.current?.getApi().refetchEvents();
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleEventClick = async (info: EventClickArg) => {
		setIsModalOpen(true);
		setLoadingDetail(true);
		setIsEditing(false);
		setIsCreating(false);
		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/reservas/${info.event.id}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			if (response.ok) {
				const data = await response.json();
				setSelectedReserva(data);
				setForm({
					nombre: data.nombre_reserva,
					descripcion: data.descripcion,
					fechainicio: formatToLocalInput(data.fechainicio),
					fechafin: formatToLocalInput(data.fechafin),
				});
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoadingDetail(false);
		}
	};

	const tienePermisoGestion = (reserva: ReservaDetalle) => {
		try {
			const permisosStr = localStorage.getItem("permisos");
			const uuidUser = localStorage.getItem("uuidUser");
			const permisos: string[] = permisosStr ? JSON.parse(permisosStr) : [];
			return (
				permisos.includes("admin:total") ||
				reserva.uuid_responsable === uuidUser
			);
		} catch {
			return false;
		}
	};

	return (
		<div className="relative text-slate-950">
			<style jsx global>{`
				/* FORZAR VISIBILIDAD DE EVENTOS */
				.fc-event {
					opacity: 1 !important;
					border: none !important;
					margin: 1px 0 !important;
				}

				/* Evitar que eventos individuales se vuelvan blancos */
				.fc-daygrid-event-dot {
					border-color: inherit !important;
				}

				.fc-event-main {
					color: #ffffff !important;
					font-weight: 700 !important;
					padding: 2px 4px !important;
				}

				.fc-event-title, .fc-event-time {
					color: #ffffff !important;
					text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
				}

				/* Asegurar que los números de los días sean negros */
				.fc .fc-daygrid-day-number {
					color: #000000 !important;
					font-weight: 800 !important;
					text-decoration: none !important;
				}

				/* Inputs y Textareas con contraste real */
				input, textarea {
					color: #000000 !important;
					background-color: #ffffff !important;
					border: 2px solid #e2e8f0 !important;
				}
				input:focus { border-color: #000 !important; }
			`}</style>

			<div className="flex justify-between items-center mb-6 px-2">
				<h3 className="text-sm font-black uppercase tracking-widest border-l-4 border-slate-950 pl-4">
					Calendario de Reservas
				</h3>
				<button
					onClick={() => {
						setIsCreating(true);
						setForm({
							nombre: "",
							descripcion: "",
							fechainicio: "",
							fechafin: "",
						});
					}}
					className="bg-slate-950 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl"
				>
					+ Nueva Reserva
				</button>
			</div>

			<div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-slate-100 overflow-hidden">
				<FullCalendar
					ref={calendarRef}
					plugins={[dayGridPlugin, interactionPlugin]}
					initialView="dayGridMonth"
					events={fetchEvents}
					locale="es"
					timeZone="Europe/Madrid"
					eventClick={handleEventClick}
					headerToolbar={{
						left: "prev,next today",
						center: "title",
						right: "dayGridMonth,dayGridWeek",
					}}
				/>
			</div>

			{(isModalOpen || isCreating) && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
					<div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border-4 border-slate-950">
						<div className="p-8">
							<h2 className="text-3xl font-black uppercase text-slate-950 mb-8 border-b-4 border-slate-100 pb-2">
								{isCreating
									? "Nueva Reserva"
									: isEditing
										? "Modificar"
										: "Detalle"}
							</h2>

							{isCreating || isEditing ? (
								<div className="space-y-4">
									<div>
										<label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
											Proyecto / Tarea
										</label>
										<input
											className="w-full p-4 rounded-xl text-base font-bold outline-none"
											value={form.nombre}
											onChange={(e) =>
												setForm({ ...form, nombre: e.target.value })
											}
											placeholder="Nombre del proyecto..."
										/>
									</div>
									<div>
										<label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
											Descripción
										</label>
										<textarea
											className="w-full p-4 rounded-xl text-base font-medium min-h-[100px] outline-none"
											value={form.descripcion}
											onChange={(e) =>
												setForm({ ...form, descripcion: e.target.value })
											}
											placeholder="Notas adicionales..."
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
												Inicio
											</label>
											<input
												type="datetime-local"
												className="w-full p-4 rounded-xl text-sm font-black"
												value={form.fechainicio}
												onChange={(e) =>
													setForm({ ...form, fechainicio: e.target.value })
												}
											/>
										</div>
										<div>
											<label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
												Fin
											</label>
											<input
												type="datetime-local"
												className="w-full p-4 rounded-xl text-sm font-black"
												value={form.fechafin}
												onChange={(e) =>
													setForm({ ...form, fechafin: e.target.value })
												}
											/>
										</div>
									</div>
								</div>
							) : loadingDetail ? (
								<div className="py-10 text-center font-black text-slate-400 uppercase">
									Cargando...
								</div>
							) : (
								selectedReserva && (
									<div className="space-y-6">
										<div className="bg-slate-950 p-4 rounded-2xl flex items-center gap-4">
											<div
												className="h-12 w-12 bg-white rounded-full flex items-center justify-center font-black"
												style={{
													color: getColorFromUuid(
														selectedReserva.uuid_responsable,
													),
												}}
											>
												{selectedReserva.nombre_completo_responsable[0]}
											</div>
											<div>
												<p className="text-[10px] font-black text-slate-400 uppercase">
													Responsable
												</p>
												<p className="text-white font-bold">
													{selectedReserva.nombre_completo_responsable}
												</p>
											</div>
										</div>
										<div>
											<p className="text-3xl font-black text-slate-950 uppercase italic leading-none">
												{selectedReserva.nombre_reserva}
											</p>
											<p className="text-slate-600 mt-2 font-medium">
												{selectedReserva.descripcion || "Sin descripción."}
											</p>
										</div>
										<div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-100">
											<div>
												<p className="text-[10px] font-black text-slate-400 uppercase">
													Desde
												</p>
												<p className="font-black text-sm">
													{new Date(selectedReserva.fechainicio).toLocaleString(
														"es-ES",
													)}
												</p>
											</div>
											<div className="text-right">
												<p className="text-[10px] font-black text-slate-400 uppercase">
													Hasta
												</p>
												<p className="font-black text-sm">
													{new Date(selectedReserva.fechafin).toLocaleString(
														"es-ES",
													)}
												</p>
											</div>
										</div>
									</div>
								)
							)}
						</div>
						<div className="bg-slate-50 p-6 flex justify-between items-center">
							<div className="flex gap-4">
								{!isCreating &&
									!isEditing &&
									selectedReserva &&
									tienePermisoGestion(selectedReserva) && (
										<>
											<button
												onClick={() => setIsEditing(true)}
												className="text-xs font-black text-blue-700 uppercase hover:underline"
											>
												Editar
											</button>
											<button
												onClick={handleDelete}
												className="text-xs font-black text-red-600 uppercase hover:underline"
											>
												Borrar
											</button>
										</>
									)}
							</div>
							<div className="flex gap-4">
								<button
									onClick={() => {
										setIsModalOpen(false);
										setIsCreating(false);
									}}
									className="px-6 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-950"
								>
									Cerrar
								</button>
								{isCreating ? (
									<button
										onClick={handleCreate}
										className="bg-slate-950 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tighter"
									>
										Confirmar
									</button>
								) : isEditing ? (
									<button
										onClick={handleUpdate}
										className="bg-green-700 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tighter"
									>
										Guardar
									</button>
								) : null}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
