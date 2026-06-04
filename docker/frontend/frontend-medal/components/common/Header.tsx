"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/lib/auth-common";

interface UserData {
	idusuario?: number;
	nombre?: string;
	apellido1?: string;
	apellido2?: string;
	correoinstitucional?: string;
	fotoperfil?: { type: string; data: number[] } | string | null;
	[key: string]: any;
}

const Header = () => {
	const router = useRouter();
	const [user, setUser] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const token = localStorage.getItem("token");
				const uuidUser = localStorage.getItem("uuidUser");

				if (!token) {
					router.push("/auth/signin");
					return;
				}

				const apiUrl = process.env.NEXT_PUBLIC_API_URL;
				if (!apiUrl) {
					throw new Error("NEXT_PUBLIC_API_URL no definida");
				}

				const response = await fetch(`${apiUrl}/api/user/${uuidUser}`, {
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					throw new Error(`Error ${response.status}`);
				}

				const data = await response.json();

				if (data.info) {
					setUser(data.info);
				} else {
					throw new Error("No se encontraron datos de usuario");
				}
			} catch (error) {
				logout();
			} finally {
				setLoading(false);
			}
		};

		fetchUser();
	}, [router]);

	// Conversión de Buffer → Base64
	useEffect(() => {
		if (!user?.fotoperfil) {
			setAvatarUrl(null);
			return;
		}

		// Caso: string directo (URL o base64)
		if (typeof user.fotoperfil === "string") {
			setAvatarUrl(user.fotoperfil);
			return;
		}

		// Caso: Buffer
		if (
			typeof user.fotoperfil === "object" &&
			user.fotoperfil.type === "Buffer" &&
			Array.isArray(user.fotoperfil.data)
		) {
			try {
				const uint8 = new Uint8Array(user.fotoperfil.data);

				let binary = "";
				for (let i = 0; i < uint8.length; i++) {
					binary += String.fromCharCode(uint8[i]);
				}

				const base64 = btoa(binary);
				setAvatarUrl(`data:image/png;base64,${base64}`);
			} catch (err) {
				console.error("Error al convertir imagen:", err);
				setAvatarUrl(null);
			}

			return;
		}

		setAvatarUrl(null);
	}, [user]);

	const handleLogout = () => {
		logout();
	};

	const getInitials = () => {
		if (!user) return "?";
		const nombre = user.nombre || "";
		const apellido1 = user.apellido1 || "";
		const apellido2 = user.apellido2 || "";
		const initials = (
			nombre.charAt(0) +
			apellido1.charAt(0) +
			apellido2.charAt(0)
		).toUpperCase();
		return initials || "?";
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
				<Link href="/dashboard" className="flex items-center space-x-3">
					<div className="relative w-10 h-10">
						<Image
							src="/logo.png"
							alt="Laboratorio"
							fill
							className="object-contain"
						/>
					</div>
					<span className="text-xl font-semibold text-gray-800 hidden sm:inline">
						Medical Analytics
					</span>
				</Link>

				<div className="relative">
					<button
						onClick={() => setMenuOpen(!menuOpen)}
						className="flex items-center space-x-2 focus:outline-none"
					>
						<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt="Avatar"
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-sm font-bold text-blue-600">
									{getInitials()}
								</span>
							)}
						</div>

						<span className="text-gray-700 hidden md:inline">
							{user?.nombre} {user?.apellido1} {user?.apellido2}
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
