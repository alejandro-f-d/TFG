"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface UserData {
	nombre?: string;
	apellidos?: string;
	correoInstitucional?: string;
	avatar?: string; // URL de imagen
}

const Header = () => {
	const router = useRouter();
	const [user, setUser] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const token = localStorage.getItem("token");
				if (!token) {
					router.push("/auth/signin");
					return;
				}

				const apiUrl = process.env.NEXT_PUBLIC_API_URL;
				const response = await fetch(`${apiUrl}/api/user/`, {
					// TODO: Cambiar la URI. En la gestión de post login obtener el array de los permisos y el uuid.
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					throw new Error("No autorizado");
				}

				const data = await response.json();
				setUser(data);
			} catch (error) {
				console.error("Error cargando usuario:", error);
				// Borrado del token y vuelta a la página de login.
				localStorage.removeItem("token");
				router.push("/auth/signin");
			} finally {
				setLoading(false);
			}
		};

		fetchUser();
	}, [router]);

	const handleLogout = () => {
		localStorage.removeItem("token");
		router.push("/auth/signin");
	};

	// Obtener iniciales para avatar de respaldo
	const getInitials = () => {
		if (!user) return "?";
		const nombre = user.nombre || "";
		const apellidos = user.apellidos || "";
		return (nombre.charAt(0) + apellidos.charAt(0)).toUpperCase();
	};

	if (loading) {
		return (
			<header className="bg-white shadow-md sticky top-0 z-50">
				<div className="container mx-auto px-4 py-3 flex justify-between items-center">
					<div className="flex items-center space-x-3">
						<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
						<div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
					</div>
					<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
				</div>
			</header>
		);
	}

	return (
		<header className="bg-white shadow-md sticky top-0 z-50">
			<div className="container mx-auto px-4 py-3 flex justify-between items-center">
				{/* Logo y nombre */}
				<Link href="/dashboard" className="flex items-center space-x-3">
					<div className="relative w-10 h-10">
						<Image
							src="/logo.png" // Ajusta según tu logo
							alt="Laboratorio"
							fill
							className="object-contain"
						/>
					</div>
					<span className="text-xl font-semibold text-gray-800 hidden sm:inline">
						Medycal Analytics
					</span>
				</Link>

				{/* Menú de usuario */}
				<div className="relative">
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="flex items-center space-x-2 focus:outline-none"
					>
						<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
							{user?.avatar ? (
								<Image
									src={user.avatar}
									alt="Avatar"
									width={40}
									height={40}
									className="rounded-full object-cover"
								/>
							) : (
								<span>{getInitials()}</span>
							)}
						</div>
						<span className="text-gray-700 hidden md:inline">
							{user?.nombre} {user?.apellidos}
						</span>
						<svg
							className="w-4 h-4 text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					{menuOpen && (
						<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
							<Link
								href="/dashboard/profile"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								onClick={() => setMenuOpen(false)}
							>
								Mi perfil
							</Link>
							<Link
								href="/dashboard/settings"
								className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
								onClick={() => setMenuOpen(false)}
							>
								Configuración
							</Link>
							<hr />
							<button
								onClick={handleLogout}
								className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
							>
								Cerrar sesión
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default Header;
