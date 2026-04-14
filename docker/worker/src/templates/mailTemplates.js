const DISCLAIMER = (email) => `
<hr/>
<p style="font-size:12px;color:#666;">
Este correo electrónico está destinado exclusivamente a la persona o entidad a la que va dirigido. 
Si usted no es el destinatario previsto, le informamos de que cualquier revisión, uso, divulgación 
o distribución está prohibida. Por favor, elimine este mensaje y notifíquelo inmediatamente a 
<a href="mailto:${email}">${email}</a>.
</p>
`;

export const templates = {
	WELCOME_USER: (data) => ({
		subject: `¡Hola ${data.nombre}! Alta en el sistema MEDAL`,
		text: `
Hola ${data.nombre},

Tu cuenta en el sistema MEDAL ha sido creada correctamente.

Puedes acceder al sistema desde el siguiente enlace:
${data.loginUrl}

Si tienes cualquier problema de acceso, contacta con el equipo de soporte.

--
Sistema MEDAL
		`,
		html: `
<h2>Bienvenido/a ${data.nombre}</h2>

<p>Tu cuenta en el sistema <b>MEDAL</b> ha sido creada correctamente.</p>

<p>
Para acceder a la plataforma haz clic en el siguiente enlace:
</p>

<p>
<a href="${data.loginUrl}" style="color:#1a73e8;">
Acceder al sistema MEDAL
</a>
</p>

<p>Si tienes cualquier problema de acceso, contacta con el equipo de soporte.</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	PASSWORD_RESET: (data) => ({
		subject: `Restablecimiento de contraseña - ${data.nombre}`,
		text: `
Hola ${data.nombre},

Hemos recibido una solicitud para restablecer tu contraseña.

Puedes crear una nueva contraseña utilizando el siguiente enlace:
${data.resetUrl}

Si no solicitaste este cambio, puedes ignorar este mensaje.

--
Sistema MEDAL
		`,
		html: `
<h2>Restablecimiento de contraseña</h2>

<p>Hola <b>${data.nombre}</b>,</p>

<p>Hemos recibido una solicitud para restablecer tu contraseña.</p>

<p>
Para crear una nueva contraseña utiliza el siguiente enlace:
</p>

<p>
<a href="${data.resetUrl}" style="color:#1a73e8;">
Restablecer contraseña
</a>
</p>

<p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	FORM_SOL: (data) => ({
		subject: `Petición de acceso a servicios MEDAL`,
		text: `
Se ha iniciado una petición de acceso a los servicios MEDAL.

Puedes continuar con el proceso desde el siguiente enlace:
${data.linkPeticion}

--
Sistema MEDAL
		`,
		html: `
<h2>Petición de acceso a servicios MEDAL</h2>

<p>Se ha iniciado una petición de acceso a los servicios de la plataforma <b>MEDAL</b>.</p>

<p>Puedes continuar con el proceso desde el siguiente enlace:</p>

<p>
<a href="${data.linkPeticion}" style="color:#1a73e8;">
Acceder a la petición
</a>
</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	PET_AVISO: (data) => ({
		subject: `Petición pendiente de aprobación`,
		text: `
Existe una petición pendiente de aprobación en la plataforma MEDAL.

Por favor, accede a la plataforma para autorizar o denegar la solicitud.

--
Sistema MEDAL
		`,
		html: `
<h2>Petición pendiente de aprobación</h2>

<p>Existe una petición que requiere tu revisión.</p>

<p>
Accede a la plataforma MEDAL para <b>autorizar o denegar</b> la solicitud correspondiente.
</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	PET_APROBADA: (data) => ({
		subject: `Petición aprobada con éxito`,
		text: `
La petición en la plataforma MEDAL ha sido aprobada correctamente.

La solicitud ya ha sido validada y procesada.

Si necesitas más información, puedes acceder a la plataforma MEDAL.

--
Sistema MEDAL
	`,
		html: `
<h2>Petición aprobada con éxito</h2>

<p>La petición ha sido <b>aprobada correctamente</b> en la plataforma MEDAL.</p>

<p>
La solicitud ya ha sido validada y procesada.
</p>

<p>
Puedes acceder a la plataforma MEDAL para consultar los detalles de la petición.
</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	PET_DENEGADA: (data) => ({
		subject: `Petición denegada`,
		text: `
La petición en la plataforma MEDAL ha sido denegada.

Motivo de la denegación:
${data.reason}

Si necesitas más información o crees que se trata de un error, puedes contactar con en respuesta a este correo o acceder a la plataforma MEDAL.

--
Sistema MEDAL
	`,
		html: `
<h2>Petición denegada</h2>

<p>La petición ha sido <b>denegada</b> en la plataforma MEDAL.</p>

<p>
<b>Motivo de la denegación:</b><br/>
${data.reason}
</p>

<p>
Si necesitas más información o crees que se trata de un error, puedes acceder a la plataforma MEDAL o contacta en respuesta a este correo.
</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),
	EXPIRACION_SERVICIOS: (data) => ({
		subject: `Aviso de caducidad de cuentas y servicios MEDAL`,

		text: `
Se ha detectado que en el día de hoy caducan las siguientes cuentas o peticiones asociadas a la plataforma MEDAL:

${data.registros}

Por favor, revisa estas entradas para determinar si deben prorrogarse o darse de baja en el sistema.

Si procede, realiza las acciones necesarias desde la plataforma MEDAL para mantener o finalizar el acceso correspondiente.

--
Sistema MEDAL
  `,

		html: `
<h2>Aviso de caducidad de cuentas y servicios</h2>

<p>
Se ha detectado que en el día de hoy caducan las siguientes cuentas o peticiones
asociadas a la plataforma <b>MEDAL</b>.
</p>

<p>
Detalle de los registros afectados:
</p>

<pre style="background:#f6f8fa;padding:12px;border-radius:6px;font-size:13px;">
${data.registros}
</pre>

<p>
Por favor, revisa estas entradas para determinar si deben
<b>prorrogarse</b> o <b>darse de baja</b> en el sistema.
</p>

<p>
Si procede, realiza las acciones necesarias desde la plataforma MEDAL
para mantener o finalizar el acceso correspondiente.
</p>

<p>Un saludo,<br/>Equipo MEDAL</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),
	SERVICIO_CAIDO: (data) => ({
		subject: `⚠️ Alerta: Servicio fuera de línea - ${data.serviceName}`,
		text: `
Se ha detectado una caída en el servicio monitorizado: ${data.serviceName}.

Hora de detección:
${data.detectedAt}

Descripción del incidente:
${data.description || "No se ha proporcionado una descripción adicional."}

Puedes consultar más detalles o seguir el estado del servicio desde el siguiente enlace:
${data.dashboardUrl}

Recibirás nuevas notificaciones si el estado cambia o el servicio se restablece.

--
Sistema de Monitorización
	`,
		html: `
<h2 style="color:#d93025;">⚠️ Alerta: Servicio fuera de línea</h2>

<p>
Se ha detectado una incidencia en el servicio monitorizado:
<b>${data.serviceName}</b>.
</p>

<p>
<b>Hora de detección:</b><br/>
${data.detectedAt}
</p>

<p>
<b>Descripción del incidente:</b><br/>
${data.description || "No se ha proporcionado una descripción adicional."}
</p>

<p style="margin-top:16px;">
Puedes consultar más detalles o seguir la evolución del estado del servicio desde el siguiente enlace:
</p>

<p>
<a href="${data.dashboardUrl}" style="color:#1a73e8;">
Ver estado del servicio
</a>
</p>

<p>
Recibirás nuevas notificaciones si el estado cambia o el servicio se restablece.
</p>

<p>Un saludo,<br/>Sistema de Monitorización</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),
	SERVICIO_RECUPERADO: (data) => ({
		subject: `✅ Servicio recuperado - ${data.serviceName}`,
		text: `
El servicio monitorizado ${data.serviceName} ha recuperado su funcionamiento normal.

Hora de recuperación:
${data.recoveredAt}

Estado actual:
${data.currentStatus || "Operativo"}

Puedes consultar más detalles del servicio en el siguiente enlace:
${data.dashboardUrl}

--
Sistema de Monitorización
	`,
		html: `
<h2 style="color:#188038;">✅ Servicio recuperado</h2>

<p>
El servicio monitorizado <b>${data.serviceName}</b> ha recuperado su funcionamiento normal.
</p>

<p>
<b>Hora de recuperación:</b><br/>
${data.recoveredAt}
</p>

<p>
<b>Estado actual:</b><br/>
${data.currentStatus || "Operativo"}
</p>

<p style="margin-top:16px;">
Puedes consultar más detalles del estado del servicio en el siguiente enlace:
</p>

<p>
<a href="${data.dashboardUrl}" style="color:#1a73e8;">
Ver estado del servicio
</a>
</p>

<p>Un saludo,<br/>Sistema de Monitorización</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),

	SYSTEM_DELETED: (data) => ({
		subject: `🗑️ Sistema eliminado - ${data.serviceName}`,
		text: `
El sistema monitorizado ${data.serviceName} ha sido eliminado de la plataforma.

Fecha de eliminación:
${data.deletedAt}



A partir de este momento, el servicio dejará de ser monitorizado y no se generarán más alertas asociadas. Recibes este correo porque eres el dueño del monitor o estabas suscrito.

--
Sistema de Monitorización
	`,
		html: `
<h2 style="color:#5f6368;">🗑️ Sistema eliminado</h2>

<p>
El sistema monitorizado <b>${data.serviceName}</b> ha sido eliminado de la plataforma.
</p>

<p>
<b>Fecha de eliminación:</b><br/>
${data.deletedAt}
</p>


<p style="margin-top:16px;">
A partir de este momento, el servicio <b>dejará de ser monitorizado</b> y no se generarán más alertas asociadas. Recibes este correo porque eres el dueño del monitor o estabas suscrito.
</p>

<p>Un saludo,<br/>Sistema de Monitorización</p>

${DISCLAIMER(data.supportEmail || "medal@ctb.upm.es")}
`,
	}),
};
