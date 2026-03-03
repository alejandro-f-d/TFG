export const templates = {
	WELCOME_USER: (data) => ({
		subject: `¡Hola ${data.nombre}, alta en el sistema medal!`,
		text: `Gracias por unirte. Puedes loguearte en: ${data.loginUrl}`,
		html: `<h1>Bienvenido ${data.nombre}</h1><p>Haz clic <a href="${data.loginUrl}">aquí</a> para entrar.</p>`,
	}),
	PASSWORD_RESET: (data) => ({
		subject: `Restablece tu contraseña ${data.nombre}`,
		text: `Usa este enlace: ${data.resetUrl}`,
		html: `<b>Tu enlace es: ${data.resetUrl}</b>`,
	}),
};
