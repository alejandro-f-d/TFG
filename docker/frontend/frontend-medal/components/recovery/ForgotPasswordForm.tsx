"use client";

import React, { useState } from "react";
import Link from "next/link";

const ForgotPasswordForm = () => {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess(false);

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
			// if (!apiUrl) throw new Error("URL de API no configurada");

			const response = await fetch(`${apiUrl}/api/user/recuperarpassword`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ correoInstitucional: email }),
			});

			if (response.status === 429) {
				const data = await response.json();
				throw new Error(
					data.error || "Demasiadas solicitudes. Espera unos minutos.",
				);
			}

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Error al enviar la solicitud");
			}

			// Respuesta 200 - éxito (mensaje genérico)
			setSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ocurrió un error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center py-12">
			<div className="container mx-auto px-4">
				<div className="max-w-md mx-auto">
					<div className="text-center mb-8">
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							Recuperar contraseña
						</h1>
						<p className="text-gray-600">
							Ingresa tu correo institucional y te enviaremos un enlace para
							restablecer tu contraseña
						</p>
					</div>

					<div className="bg-white rounded-2xl shadow-xl p-8">
						{error && (
							<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
								{error}
							</div>
						)}
						{success && (
							<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
								Si el correo está registrado, recibirás un enlace para
								restablecer tu contraseña. Revisa tu bandeja de entrada (y
								spam).
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Correo institucional
								</label>
								<input
									type="email"
									id="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
									placeholder="****@****.upm.es"
									required
									disabled={loading}
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Enviando..." : "Enviar instrucciones"}
							</button>
						</form>

						<div className="mt-6 text-center">
							<Link
								href="/auth/signin"
								className="text-sm text-blue-600 hover:text-blue-800"
							>
								← Volver al inicio de sesión
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ForgotPasswordForm;
