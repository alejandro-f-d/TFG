import nodemailer from "nodemailer";
export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GOOGLE_APP_PASSWORD,
	},
});
