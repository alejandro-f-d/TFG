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
		icon: "/apache-tomcat.png",
		title: "Apache Tomcat",
		description: "Acceso al manager del servicio de Apache Tomcat.",
		path: "/manager/html",
		requiredPermissions: ["admin:total"],
	},
	{
		icon: "🗓️",
		title: "Calendario",
		description:
			"Realizas una reserva en uno de los servidores que tienes permisos para el uso de los recursos",
		path: "/dashboard/reserva",
		requiredPermissions: ["null:null", "admin:total"], // A pesar de que lo puede ver todo el mundo, el filtrado de la siguiente página se encuentra de mostrar o no servicios.
	},
	{
		icon: "🎯",
		title: "Bull Dashboard",
		description:
			"Visualización del estado de las colas al redis, con cada uno de sus estados.",
		path: "/admin/queues/",
		requiredPermissions: ["gestionarRecursos", "admin:total"],
	},
	{
		icon: "/swagger.png",
		title: "Swagger",
		description: "Documentación de la API del backend.",
		path: "/api-docs/",
		requiredPermissions: ["swagger:viewDocs", "admin:total"],
	},
	{
		icon: "🖴",
		title: "Dispositivos",
		description: "Inventariaje de los dispositivos.",
		path: "/dashboard/dispositivos",
		requiredPermissions: [
			"dispositivo:postDispositivo",
			"dispositivo:getDispositivo",
			"dispositivo:deleteDispositivo",
			"admin:total",
		],
	},
	{
		icon: "📊",
		title: "Monitor",
		description: "Gestión de la monitorización de servicios web",
		path: "/dashboard/monitor",
		requiredPermissions: [
			"monitor:postMonitor",
			"monitor:listar",
			"monitor:borrar",
			"admin:total",
		],
	},
	{
		icon: "🛠️",
		title: "Permisos",
		description:
			"Obtención de la lista de permisos del sistema con su información asociada.",
		path: "/dashboard/permisos",
		requiredPermissions: ["perm:listarPermiso", "admin:total"],
	},
	{
		icon: "📩",
		title: "Peticiones",
		description: "Gestión de las peticiones según tus permisos.",
		path: "/dashboard/peticiones",
		requiredPermissions: ["null:null", "admin:total"], // Lo que se verá dependerá de las siguientes pantallas lo que ve.
	},
	{
		icon: "/gitlab.jpg",
		title: "Gitlab",
		description: "Gestión de los proyectos gitlab.",
		path: "/dashboard/gitlab",
		requiredPermissions: [
			"gitlab:postProyecto",
			"itlab:getProyecto",
			"admin:total",
		],
	},

	{
		icon: "🚪",
		title: "Puerta",
		description: "Gestión de las puertas NUKI",
		path: "/dashboard/puerta",
		requiredPermissions: [
			"puertas:postPuerta",
			"puertas:getPuertas",
			"admin:total",
		],
	},

	{
		icon: "🛡️",
		title: "Roles",
		description: "Gestión de los Roles del Sistema",
		path: "/dashboard/roles",
		requiredPermissions: [
			"roles:deleteRol",
			"roles:getRoles",
			"roles:postRoles",
			"admin:total",
		],
	},

	{
		icon: "🔨",
		title: "Máquinas",
		description: "Inventariaje de las máquinas.",
		path: "/dashboard/maquinas",
		requiredPermissions: ["maq:getAll", "admin:total"],
	},

	{
		icon: "☁️",
		title: "Servidores",
		description: "Gestión de la monitorización de servicios web",
		path: "/dashboard/servidores",
		requiredPermissions: [
			"maq:postMaquina",
			"maq:editServer",
			"maq:getServer",
			"admin:total",
		],
	},
	{
		icon: "⚡",
		title: "Servicios TI",
		description: "Gestión de la monitorización de servicios web",
		path: "/dashboard/servicios",
		requiredPermissions: ["servicios:getAll", "servicios:get", "admin:total"],
	},
	{
		icon: "🪪",
		title: "Datos propios",
		description: "Acceso directo a los datos personales propios.",
		path: "/dashboard/profile",
		requiredPermissions: ["null:null", "admin:total"],
	},

	{
		icon: "👥",
		title: "Usuarios",
		description: "Gestión de los usuarios en el sistema.",
		path: "/dashboard/usuarios",
		requiredPermissions: ["usr:crearUsuario", "usr:editUsuario", "admin:total"],
	},
];
