"use client";

import { use, useState } from "react";
import dynamic from "next/dynamic";

const CalendarComponent = dynamic(
	() => import("@/components/calendar/calendarFunctions"),
	{
		ssr: false,
		loading: () => (
			<div className="p-10 text-center text-gray-400 font-medium">
				Cargando interfaz de calendario...
			</div>
		),
	},
);

export default function Page({
	params,
}: {
	params: Promise<{ uuid: string }>;
}) {
	const { uuid } = use(params);
	const [nombreMaquina, setNombreMaquina] = useState<string>("");

	if (!uuid || uuid === "undefined") {
		return (
			<div className="p-8 text-center text-gray-500">
				Cargando parámetros...
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-7xl">
			<header className="mb-8 border-b border-gray-100 pb-6">
				<h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
					Reservas:{" "}
					<span className="text-blue-600">
						{nombreMaquina || "Cargando..."}
					</span>
				</h1>
				<div className="mt-2 flex items-center gap-2">
					<span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">
						UUID
					</span>
					<p className="text-xs text-gray-400 font-mono">{uuid}</p>
				</div>
			</header>

			<section>
				<CalendarComponent
					maquinaUuid={uuid}
					onMachineNameLoaded={(name) => setNombreMaquina(name)}
				/>
			</section>
		</div>
	);
}
