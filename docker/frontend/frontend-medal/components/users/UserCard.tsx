// components/usuarios/UserCard.tsx
"use client";

import React, { useState, useEffect } from "react";

interface Role {
	id: number;
	nombre: string;
}

interface User {
	idusuario: number;
	uuidusuario: string; // ← Añadir este campo
	nombre: string;
	apellido1: string;
	apellido2: string;
	correoinstitucional: string;
	activo: boolean;
	esresponsable: boolean;
	roles?: Role[];
	fotoperfil?: { type: string; data: number[] } | string | null;
	[key: string]: any;
}

interface UserCardProps {
	user: User;
	onClick?: () => void;
}

// Función para convertir fotoperfil a URL de imagen
const getAvatarUrl = (fotoperfil: any): string | null => {
	if (!fotoperfil) return null;
	if (typeof fotoperfil === "string") return fotoperfil;
	if (fotoperfil.type === "Buffer" && Array.isArray(fotoperfil.data)) {
		try {
			const uint8 = new Uint8Array(fotoperfil.data);
			let binary = "";
			for (let i = 0; i < uint8.length; i++) {
				binary += String.fromCharCode(uint8[i]);
			}
			const base64 = btoa(binary);
			return `data:image/png;base64,${base64}`;
		} catch {
			return null;
		}
	}
	return null;
};

// Mapeo de colores por tipo de rol
const getRoleColor = (roleName: string): string => {
	const roleColors: Record<string, string> = {
		responsable: "bg-purple-100 text-purple-700",
		admin: "bg-red-100 text-red-700",
		tecnico: "bg-yellow-100 text-yellow-700",
		usuario: "bg-blue-100 text-blue-700",
		invitado: "bg-gray-100 text-gray-700",
	};
	return roleColors[roleName.toLowerCase()] || "bg-gray-100 text-gray-700";
};

// Función que genera los badges basados en los datos del usuario
const getUserBadges = (user: User) => {
	const badges = [];

	// Estado activo/inactivo
	badges.push({
		label: user.activo ? "Activo" : "Inactivo",
		color: user.activo
			? "bg-green-100 text-green-700"
			: "bg-red-100 text-red-700",
	});

	// Roles del usuario (desde el array roles)
	if (user.roles && user.roles.length > 0) {
		user.roles.forEach((role) => {
			badges.push({
				label: role.nombre.charAt(0).toUpperCase() + role.nombre.slice(1),
				color: getRoleColor(role.nombre),
			});
		});
	} else {
		// Si no tiene roles asignados, mostrar "Usuario" por defecto
		badges.push({
			label: "Usuario",
			color: "bg-blue-100 text-blue-700",
		});
	}

	return badges;
};

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const badges = getUserBadges(user);

	useEffect(() => {
		if (user.fotoperfil) {
			const url = getAvatarUrl(user.fotoperfil);
			setAvatarUrl(url);
		} else {
			setAvatarUrl(null);
		}
	}, [user.fotoperfil]);

	const getInitials = () => {
		const nombre = user.nombre || "";
		const apellido1 = user.apellido1 || "";
		const apellido2 = user.apellido2 || "";
		return (
			(
				nombre.charAt(0) +
				apellido1.charAt(0) +
				apellido2.charAt(0)
			).toUpperCase() || "?"
		);
	};

	return (
		<div
			onClick={onClick}
			className="bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer p-4 flex items-center space-x-4"
		>
			{/* Avatar */}
			<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
				{avatarUrl ? (
					<img
						src={avatarUrl}
						alt="Avatar"
						className="w-full h-full object-cover"
					/>
				) : (
					<span className="text-blue-600 font-bold text-lg">
						{getInitials()}
					</span>
				)}
			</div>

			{/* Información del usuario */}
			<div className="flex-1">
				<h3 className="font-semibold text-gray-800">
					{user.nombre} {user.apellido1} {user.apellido2}
				</h3>
				<p className="text-sm text-gray-500">{user.correoinstitucional}</p>

				{/* Badges */}
				<div className="flex flex-wrap gap-2 mt-2">
					{badges.map((badge, idx) => (
						<span
							key={idx}
							className={`text-xs px-2 py-1 rounded-full ${badge.color}`}
						>
							{badge.label}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};

export default UserCard;
