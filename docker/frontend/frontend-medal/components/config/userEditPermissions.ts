// components/config/userEditPermissions.ts
export interface EditFieldPermission {
	field: string;
	requiredPermissions: string[];
	inputType?: string;
	label: string;
	editableBySelf?: boolean;
}

export const editFieldPermissions: EditFieldPermission[] = [
	{
		field: "nombre",
		requiredPermissions: [],
		inputType: "text",
		label: "Nombre",
		editableBySelf: true,
	},
	{
		field: "apellido1",
		requiredPermissions: [],
		inputType: "text",
		label: "Primer apellido",
		editableBySelf: true,
	},
	{
		field: "apellido2",
		requiredPermissions: [],
		inputType: "text",
		label: "Segundo apellido",
		editableBySelf: true,
	},
	{
		field: "fotoPerfil",
		requiredPermissions: [],
		inputType: "file",
		label: "Foto de perfil",
		editableBySelf: true,
	},
	{
		field: "teams",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "checkbox",
		label: "Teams",
		editableBySelf: false,
	},
	{
		field: "esresponsable",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "checkbox",
		label: "Es responsable",
		editableBySelf: false,
	},
	{
		field: "usuariovpn",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "text",
		label: "Usuario VPN",
		editableBySelf: false,
	},
	{
		field: "correoinstitucional",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "email",
		label: "Correo institucional",
		editableBySelf: false,
	},
	{
		field: "activo",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "checkbox",
		label: "Activo",
		editableBySelf: false,
	},
	{
		field: "fechaincorporacion",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "date",
		label: "Fecha de incorporación",
		editableBySelf: false,
	},
	{
		field: "fechafin",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "date",
		label: "Fecha fin",
		editableBySelf: false,
	},
	{
		field: "wifi",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "checkbox",
		label: "WiFi",
		editableBySelf: false,
	},
	{
		field: "tarjetaacceso",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "text",
		label: "Tarjeta acceso",
		editableBySelf: false,
	},
	{
		field: "diriplastlogin",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "text",
		label: "Última IP de login",
		editableBySelf: false,
	},
	{
		field: "contrasena",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "password",
		label: "Contraseña",
		editableBySelf: false,
	},
	{
		field: "gitlab",
		requiredPermissions: [
			"admin:total",
			"gitlab:getProyecto",
			"gitlab:postProyecto",
		],
		inputType: "text",
		label: "GitLab",
		editableBySelf: false,
	},
	{
		field: "responsable",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "select",
		label: "Responsable",
		editableBySelf: false,
	},
	{
		field: "roles",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "multiselect",
		label: "Roles",
		editableBySelf: false,
	},
	{
		field: "puertasAutorizadas",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "multiselect",
		label: "Puertas autorizadas",
		editableBySelf: false,
	},
	{
		field: "duenoMaquina",
		requiredPermissions: ["admin:total", "usr:editUsuario"],
		inputType: "multiselect",
		label: "Máquinas en propiedad",
		editableBySelf: false,
	},
];

export const getEditableFields = (
	userPermissions: string[],
	isOwnProfile: boolean,
): string[] => {
	const isAdminOrEditor =
		userPermissions.includes("admin:total") ||
		userPermissions.includes("usr:editUsuario");

	return editFieldPermissions
		.filter((field) => {
			if (isAdminOrEditor) return true;
			if (isOwnProfile && field.editableBySelf) return true;
			return false;
		})
		.map((field) => field.field);
};

export const getFieldConfig = (field: string) => {
	return editFieldPermissions.find((f) => f.field === field);
};
