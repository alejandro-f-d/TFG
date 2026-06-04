import { transporter } from "../config/mailer.js";
import { templates } from "../templates/mailTemplates.js";

export const mailProcessor = async (job) => {
	const { template, to, ...datos } = job.data;

	const templateFn = templates[template];
	if (!templateFn) throw new Error(`Plantilla [${template}] no soportada`);

	const { subject, text, html } = templateFn(datos);

	await transporter.sendMail({
		from: `"Sistema Medal" <${process.env.GMAIL_USER}>`,
		to,
		subject,
		text,
		html,
	});

	return { status: "sent", recipient: to };
};
