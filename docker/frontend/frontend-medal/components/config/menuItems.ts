// components/config/menuItems.ts
export interface MenuItem {
	icon: string;
	title: string;
	description: string;
	path: string;
	requiredPermissions: string[]; // <- solo string[]
}

export const allMenuItems: MenuItem[] = [
	{
		icon: "📊",
		title: "Gestión de datos",
		description: "Actualiza tu información personal",
		path: "/dashboard/data",
		requiredPermissions: ["verPropiosDatos", "admin:total"],
	},
	{
		icon: "📝",
		title: "Petición de servicios",
		description: "Solicita servicios informáticos",
		path: "/dashboard/services",
		requiredPermissions: ["crearPeticiones", "admin:total"],
	},
	{
		icon: "⚙️",
		title: "Gestión de recursos",
		description: "Visualiza recursos asignados",
		path: "/dashboard/resources",
		requiredPermissions: ["gestionarRecursos", "admin:total"],
	},
	{
		icon: "👥",
		title: "Usuarios",
		description: "Gestionar usuarios del laboratorio",
		path: "/dashboard/users",
		requiredPermissions: ["gestionarUsuarios", "admin:total"],
	},
	{
		icon: "🚪",
		title: "Puertas",
		description: "Control de accesos",
		path: "/dashboard/doors",
		requiredPermissions: ["gestionarPuertas", "admin:total"],
	},
	{
		icon: "💻",
		title: "Máquinas",
		description: "Gestión de servidores",
		path: "/dashboard/machines",
		requiredPermissions: ["gestionarMaquinas", "admin:total"],
	},
];
