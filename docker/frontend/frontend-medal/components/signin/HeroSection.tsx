"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

const HeroSection = () => {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false); // Ahora se usará en el botón
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState(""); // Ahora se mostrará en el UI

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

			const response = await fetch(`${apiUrl}/api/user/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					correoInstitucional: email,
					contrasena: password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Credenciales incorrectas");
			}

			if (data.token) {
				const dosHoras = 1 / 12;
				Cookies.set("token", data.token, {
					expires: dosHoras,
					path: "/",
				});

				// El resto de datos no sensibles pueden seguir en localStorage
				localStorage.setItem("token", data.token); // Mantenerlo aquí también si tu código actual lo usa
				localStorage.setItem("uuidUser", data.uuidUser);
				localStorage.setItem("permisos", data.permisos);

				let permisosArray: string[] = [];
				if (Array.isArray(data.permisos)) {
					permisosArray = data.permisos;
				} else if (typeof data.permisos === "string") {
					permisosArray = data.permisos.split(",").map((p: string) => p.trim());
				}

				localStorage.setItem("permisos", JSON.stringify(permisosArray));

				if (data.nombre) {
					localStorage.setItem("userName", data.nombre);
				}

				router.push("/dashboard");
			} else {
				throw new Error("No se recibió token de autenticación");
			}
		} catch (err) {
			console.error("Error en login:", err);
			setError(err instanceof Error ? err.message : "Error de conexión");
		} finally {
			setLoading(false);
		}
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	return (
		<section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center py-12">
			<div className="container mx-auto px-4">
				<div className="max-w-md mx-auto">
					<div className="text-center mb-8">
						<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
							Bienvenido de nuevo
						</h1>
						<p className="text-gray-600">
							Accede a tu cuenta para gestionar tus solicitudes y recursos
						</p>
					</div>

					<div className="bg-white rounded-2xl shadow-xl p-8">
						{/* --- SOLUCIÓN ERROR: Renderizado del mensaje de error --- */}
						{error && (
							<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
								{error}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Correo electrónico
								</label>
								<input
									type="email"
									id="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full px-5 py-3 border-2 border-slate-950 rounded-xl font-black text-slate-950 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-700 outline-none transition-all placeholder:text-slate-400"
									placeholder="********@****.upm.es"
									required
									disabled={loading} // Deshabilitar mientras carga
								/>
							</div>

							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Contraseña
								</label>
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										id="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full px-5 py-3 border-2 border-slate-950 rounded-xl font-black text-slate-950 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-700 outline-none transition-all placeholder:text-slate-400"
										placeholder="••••••••"
										required
										disabled={loading} // Deshabilitar mientras carga
									/>
									<button
										type="button"
										onClick={togglePasswordVisibility}
										className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
										aria-label={
											showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
										}
									>
										{showPassword ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-5 h-5"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M3.98 8.223A10.477 10.477 0 0012 12.75a10.477 10.477 0 008.02-4.527m-8.02 4.527v5.25m-7.5-5.25v5.25m7.5-5.25v5.25m-7.5-5.25v5.25M3.98 8.223A10.477 10.477 0 0012 12.75a10.477 10.477 0 008.02-4.527m-8.02 4.527v5.25"
												/>
											</svg>
										) : (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-5 h-5"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
												/>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
												/>
											</svg>
										)}
									</button>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<Link
									href="/auth/forgot-password"
									className="text-sm text-blue-600 hover:text-blue-800"
								>
									¿Olvidaste tu contraseña?
								</Link>
							</div>

							{/* --- SOLUCIÓN LOADING: Feedback en el botón --- */}
							<button
								type="submit"
								disabled={loading}
								className={`w-full text-white py-2 px-4 rounded-lg transition font-semibold flex justify-center items-center ${
									loading
										? "bg-blue-400 cursor-not-allowed"
										: "bg-blue-600 hover:bg-blue-700"
								}`}
							>
								{loading ? (
									<>
										<svg
											className="animate-spin h-5 w-5 mr-3 text-white"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
												fill="none"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Cargando...
									</>
								) : (
									"Iniciar sesión"
								)}
							</button>
						</form>
					</div>
				</div>
			</div>
		</section>
	);
};

export default HeroSection;
