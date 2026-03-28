// app/dashboard/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserList from "@/components/users/UserList";
import { logout } from "@/lib/auth-common";

const requiredCreatePermissions = [
	"usr:create",
	"usr:getUsuario",
	"admin:total",
];

export default function AdminUsersPage() {
	const router = useRouter();
	const [canCreate, setCanCreate] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) {
			logout();
			return;
		}

		const permisosRaw = localStorage.getItem("permisos");
		let userPermissions: string[] = [];
		if (permisosRaw) {
			try {
				userPermissions = JSON.parse(permisosRaw);
			} catch (e) {
				console.error("Error al parsear permisos", e);
			}
		}

		const hasCreatePermission = requiredCreatePermissions.some((perm) =>
			userPermissions.includes(perm),
		);
		setCanCreate(hasCreatePermission);
		setLoading(false);
	}, []);

	const handleCreateUser = () => {
		router.push("/dashboard/usuarios/create");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-100 py-12">
				<div className="container mx-auto px-4">
					<div className="animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
						<div className="h-10 bg-gray-200 rounded mb-6"></div>
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-24 bg-gray-200 rounded"></div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-100 py-12">
			<div className="container mx-auto px-4">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-gray-800">
						Administración de Usuarios
					</h1>
					{canCreate && (
						<button
							onClick={handleCreateUser}
							className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
									clipRule="evenodd"
								/>
							</svg>
							<span>Nuevo usuario</span>
						</button>
					)}
				</div>

				<UserList
					onEditUser={(uuid) => router.push(`/dashboard/usuarios/${uuid}`)}
				/>
			</div>
		</div>
	);
}
