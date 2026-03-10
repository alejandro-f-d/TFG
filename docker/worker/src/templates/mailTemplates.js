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
};
