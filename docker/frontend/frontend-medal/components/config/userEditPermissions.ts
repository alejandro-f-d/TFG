// config/userEditPermissions.ts
export interface EditFieldPermission {
	field: string;
	requiredPermissions: string[];
	inputType?: string; // 'text', 'email', 'date', 'checkbox', 'select', 'password', 'file', 'multiselect'
	label: string;
	editableBySelf?: boolean;
}

export const editFieldPermissions: EditFieldPermission[] = [
	// Campos editables por el propio usuario
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

	// Campos solo para admin/editor
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
		requiredPermissions: ["admin:total", "usr:editUsuario"],
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

// Función para obtener los campos editables según los permisos del usuario
export const getEditableFields = (
	userPermissions: string[],
	isOwnProfile: boolean,
): string[] => {
	// Si el usuario tiene permisos de admin o editor, puede editar todo independientemente de si es su propio perfil
	const isAdminOrEditor =
		userPermissions.includes("admin:total") ||
		userPermissions.includes("usr:editUsuario");

	return editFieldPermissions
		.filter((field) => {
			// Si es admin/editor, puede editar todos los campos (sin restricción de editableBySelf)
			if (isAdminOrEditor) {
				return true;
			}
			// Si no es admin/editor y es su propio perfil, solo campos editableBySelf
			if (isOwnProfile && field.editableBySelf) {
				return true;
			}
			return false;
		})
		.map((field) => field.field);
};

// Función para obtener la configuración de un campo específico
export const getFieldConfig = (field: string) => {
	return editFieldPermissions.find((f) => f.field === field);
};
