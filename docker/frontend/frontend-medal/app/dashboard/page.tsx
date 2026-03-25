"use client";

import { useRouter } from "next/navigation";
import MenuCard from "@/components/common/MenuCard";

export default function DashboardPage() {
	const router = useRouter();

	// Definición de las opciones del menú
	const menuItems = [
		{
			icon: "📊",
			title: "Gestión de datos",
			description: "Actualiza tu información personal",
			onClick: () => router.push("/dashboard/data"),
		},
		{
			icon: "📝",
			title: "Petición de servicios",
			description: "Solicita servicios informáticos",
			onClick: () => router.push("/dashboard/services"),
		},
		{
			icon: "⚙️",
			title: "Gestión de recursos",
			description: "Visualiza recursos asignados",
			onClick: () => router.push("/dashboard/resources"),
		},
		{
			icon: "👥",
			title: "Usuarios",
			description: "Gestionar usuarios del laboratorio",
			onClick: () => router.push("/dashboard/users"),
		},
	];

	return (
		<div className="py-12">
			<div className="container mx-auto px-4">
				{/* Encabezado de la sección */}
				<div className="mb-10">
					<h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
					<p className="text-gray-600 mt-2">
						Bienvenido al panel de control de Medycal Analytics.
					</p>
				</div>

				{/* Rejilla de tarjetas de menú */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					{menuItems.map((item, idx) => (
						<MenuCard
							key={idx}
							icon={item.icon}
							title={item.title}
							description={item.description}
							onClick={item.onClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
