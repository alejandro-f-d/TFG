"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const ResetPasswordForm = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		if (!token) {
			setError("Token no válido o faltante. Verifica el enlace que recibiste.");
		}
	}, [token]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		if (password !== confirmPassword) {
			setError("Las contraseñas no coinciden");
			setLoading(false);
			return;
		}

		if (password.length < 6) {
			setError("La contraseña debe tener al menos 6 caracteres");
			setLoading(false);
			return;
		}

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			if (!apiUrl) throw new Error("URL de API no configurada");

			const response = await fetch(`${apiUrl}/api/user/recuperarpassword`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, contrasena: password }),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || "Error al restablecer la contraseña");
			}

			setSuccess(true);
			setTimeout(() => {
				router.push("/auth/signin");
			}, 3000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ocurrió un error");
		} finally {
			setLoading(false);
		}
	};

	if (!token && !error) {
		return (
			<section className="min-h-screen flex items-center justify-center">
				<div className="text-center">Cargando...</div>
			</section>
		);
	}

	return (
		<section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center py-12">
			<div className="container mx-auto px-4">
				<div className="max-w-md mx-auto">
					<div className="text-center mb-8">
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							Nueva contraseña
						</h1>
						<p className="text-gray-600">Ingresa tu nueva contraseña</p>
					</div>

					<div className="bg-white rounded-2xl shadow-xl p-8">
						{error && (
							<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
								{error}
							</div>
						)}
						{success && (
							<div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
								Contraseña actualizada con éxito. Redirigiendo al inicio de
								sesión...
							</div>
						)}

						{!success && token && (
							<form onSubmit={handleSubmit} className="space-y-6">
								<div>
									<label
										htmlFor="password"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Nueva contraseña
									</label>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											id="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-10"
											placeholder="••••••••"
											required
											disabled={loading}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
											disabled={loading}
										>
											{showPassword ? "👁️" : "👁️‍🗨️"}
										</button>
									</div>
								</div>

								<div>
									<label
										htmlFor="confirmPassword"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Confirmar contraseña
									</label>
									<input
										type={showPassword ? "text" : "password"}
										id="confirmPassword"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
										placeholder="••••••••"
										required
										disabled={loading}
									/>
								</div>

								<button
									type="submit"
									disabled={loading}
									className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? "Restableciendo..." : "Restablecer contraseña"}
								</button>
							</form>
						)}
					</div>
				</div>
			</div>
		</section>
	);
};

export default ResetPasswordForm;
