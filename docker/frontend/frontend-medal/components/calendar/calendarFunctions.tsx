"use client";

import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventSourceFunc, EventClickArg } from "@fullcalendar/core";

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
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
];

export default function CalendarFunctions({
	maquinaUuid,
	onMachineNameLoaded,
}: CalendarProps) {
	const [selectedReserva, setSelectedReserva] = useState<ReservaDetalle | null>(
		null,
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [calendarApi, setCalendarApi] = useState<any>(null);

	// Estado del formulario (Solo campos permitidos para PATCH)
	const [editForm, setEditForm] = useState({
		nombre: "",
		descripcion: "",
		fechainicio: "",
		fechafin: "",
	});

	// --- LÓGICA DE PERMISOS ---
	const tienePermisoGestion = (reserva: ReservaDetalle) => {
		try {
			const permisosStr = localStorage.getItem("permisos");
			const uuidUser = localStorage.getItem("uuidUser");
			const permisos: string[] = permisosStr ? JSON.parse(permisosStr) : [];

			const esAdmin = permisos.includes("admin:total");
			const esDueno = reserva.uuid_responsable === uuidUser;

			return esAdmin || esDueno;
		} catch (e) {
			return false;
		}
	};

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
				if (Array.isArray(data.info)) {
					if (data.info.length > 0)
						onMachineNameLoaded?.(data.info[0].nombre_maquina);
					successCallback(
						data.info.map((r: any) => ({
							id: r.uuidcalendario,
							title: r.nombre_reserva,
							start: r.fechainicio,
							end: r.fechafin,
							backgroundColor:
								EVENT_COLORS[r.id_responsable % EVENT_COLORS.length],
							extendedProps: {
								responsable_nombre: r.nombre_completo_responsable,
							},
						})),
					);
				} else {
					onMachineNameLoaded?.(data.info);
					successCallback([]);
				}
			}
		} catch (error) {
			failureCallback(error as Error);
		}
	};

	const handleEventClick = async (info: EventClickArg) => {
		setCalendarApi(info.view.calendar);
		const uuidReserva = info.event.id;
		setIsModalOpen(true);
		setLoadingDetail(true);
		setIsEditing(false);

		try {
			const token = localStorage.getItem("token");
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/reservas/${uuidReserva}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			if (response.ok) {
				const data = await response.json();
				setSelectedReserva(data);
				setEditForm({
					nombre: data.nombre_reserva,
					descripcion: data.descripcion,
					fechainicio: data.fechainicio.slice(0, 16), // Formato para input datetime-local
					fechafin: data.fechafin.slice(0, 16),
				});
			} else {
				setSelectedReserva({
					uuidcalendario: uuidReserva,
					nombre_reserva: info.event.title,
					descripcion: "Información protegida o no disponible.",
					fechainicio: info.event.startStr,
					fechafin: info.event.endStr,
					nombre_maquina: "",
					uuid_responsable: "restringido",
					nombre_completo_responsable:
						info.event.extendedProps.responsable_nombre,
				});
			}
		} catch (error) {
			console.error(error);
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleDelete = async () => {
		if (
			!selectedReserva ||
			!confirm(
				"¿Estás seguro de que deseas eliminar esta reserva? Esta acción es irreversible.",
			)
		)
			return;
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
				calendarApi?.refetchEvents();
			} else {
				const err = await response.json();
				alert(err.error || "Error al eliminar");
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
						nombre: editForm.nombre,
						descripcion: editForm.descripcion,
						fechainicio: new Date(editForm.fechainicio).toISOString(),
						fechafin: new Date(editForm.fechafin).toISOString(),
					}),
				},
			);
			if (response.ok) {
				setIsEditing(false);
				setIsModalOpen(false);
				calendarApi?.refetchEvents();
			} else {
				const err = await response.json();
				alert(err.error || "Error al actualizar");
			}
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div className="relative">
			<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
				<FullCalendar
					plugins={[dayGridPlugin, interactionPlugin]}
					initialView="dayGridMonth"
					events={fetchEvents}
					locale="es"
					eventClick={handleEventClick}
				/>
			</div>

			{isModalOpen && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
					<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
						<div className="p-6">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-xl font-bold text-gray-800">
									{isEditing ? "Editar Reserva" : "Detalle de Reserva"}
								</h2>
								<button
									onClick={() => setIsModalOpen(false)}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									✕
								</button>
							</div>

							{loadingDetail ? (
								<div className="py-12 text-center text-gray-500 animate-pulse font-medium">
									Obteniendo información...
								</div>
							) : (
								selectedReserva && (
									<div className="space-y-5">
										{isEditing ? (
											<div className="space-y-4">
												<div>
													<label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 ml-1">
														Nombre
													</label>
													<input
														type="text"
														className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
														value={editForm.nombre}
														onChange={(e) =>
															setEditForm({
																...editForm,
																nombre: e.target.value,
															})
														}
													/>
												</div>
												<div>
													<label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 ml-1">
														Descripción
													</label>
													<textarea
														className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all min-h-[80px]"
														value={editForm.descripcion}
														onChange={(e) =>
															setEditForm({
																...editForm,
																descripcion: e.target.value,
															})
														}
													/>
												</div>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 ml-1">
															Inicio
														</label>
														<input
															type="datetime-local"
															className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
															value={editForm.fechainicio}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	fechainicio: e.target.value,
																})
															}
														/>
													</div>
													<div>
														<label className="text-[10px] font-bold uppercase text-gray-400 block mb-1 ml-1">
															Fin
														</label>
														<input
															type="datetime-local"
															className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
															value={editForm.fechafin}
															onChange={(e) =>
																setEditForm({
																	...editForm,
																	fechafin: e.target.value,
																})
															}
														/>
													</div>
												</div>
											</div>
										) : (
											<div className="space-y-4">
												<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
													<div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
														{selectedReserva.nombre_completo_responsable[0]}
													</div>
													<div>
														<p className="text-[10px] uppercase font-bold text-blue-400 leading-none">
															Responsable
														</p>
														<p className="text-sm font-semibold text-blue-900">
															{selectedReserva.nombre_completo_responsable}
														</p>
													</div>
												</div>

												{selectedReserva.uuid_responsable !== "restringido" && (
													<>
														<div>
															<p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
																Proyecto / Tarea
															</p>
															<p className="text-gray-800 font-medium">
																{selectedReserva.nombre_reserva}
															</p>
														</div>
														<div>
															<p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
																Descripción
															</p>
															<p className="text-gray-600 text-sm leading-relaxed">
																{selectedReserva.descripcion}
															</p>
														</div>
														<div className="flex justify-between pt-2 border-t border-gray-50">
															<div>
																<p className="text-[10px] uppercase font-bold text-gray-400">
																	Inicio
																</p>
																<p className="text-xs text-gray-700">
																	{new Date(
																		selectedReserva.fechainicio,
																	).toLocaleString("es-ES")}
																</p>
															</div>
															<div>
																<p className="text-[10px] uppercase font-bold text-gray-400 text-right">
																	Fin
																</p>
																<p className="text-xs text-gray-700 text-right">
																	{new Date(
																		selectedReserva.fechafin,
																	).toLocaleString("es-ES")}
																</p>
															</div>
														</div>
													</>
												)}
											</div>
										)}
									</div>
								)
							)}
						</div>

						<div className="bg-gray-50 px-6 py-4 flex justify-between items-center gap-3">
							<div className="flex gap-2">
								{!isEditing &&
									selectedReserva &&
									tienePermisoGestion(selectedReserva) && (
										<>
											<button
												onClick={() => setIsEditing(true)}
												className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
											>
												EDITAR
											</button>
											<button
												onClick={handleDelete}
												className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
											>
												BORRAR
											</button>
										</>
									)}
							</div>

							<div className="flex gap-2">
								{isEditing ? (
									<>
										<button
											onClick={() => setIsEditing(false)}
											className="px-4 py-2 text-gray-500 text-xs font-bold hover:bg-gray-200 rounded-lg transition-all"
										>
											CANCELAR
										</button>
										<button
											onClick={handleUpdate}
											className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-md shadow-green-100"
										>
											GUARDAR CAMBIOS
										</button>
									</>
								) : (
									<button
										onClick={() => setIsModalOpen(false)}
										className="px-6 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
									>
										CERRAR
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
