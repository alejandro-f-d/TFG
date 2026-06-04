"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MenuCard from "@/components/common/MenuCard";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { allMenuItems, MenuItem } from "@/components/config/menuItems"; // <- ruta correcta
import { logout } from "@/lib/auth-common";

export default function DashboardPage() {
	const router = useRouter();
	const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [userName, setUserName] = useState("");

	useEffect(() => {
		const token = localStorage.getItem("token");
		const permisosRaw = localStorage.getItem("permisos");
		console.log("Los permisos de este usuario son:", permisosRaw);

		if (!token) {
			logout();
		}

		let userPermissions: string[] = [];
		if (permisosRaw) {
			try {
				userPermissions = JSON.parse(permisosRaw);
			} catch (e) {
				console.error("Error al parsear permisos", e);
			}
		}

		console.log("Permisos del usuario:", userPermissions);

		const filtered = allMenuItems.filter((item) => {
			if (userPermissions.includes("admin:total")) return true;

			if (item.requiredPermissions.includes("null:null")) return true;

			return item.requiredPermissions.some((perm) =>
				userPermissions.includes(perm),
			);
		});

		setMenuItems(filtered);

		const storedName = localStorage.getItem("userName");
		if (storedName) setUserName(storedName);

		setLoading(false);
	}, [router]);

	if (loading) {
		return (
			<>
				<Header />
				<div className="py-12 min-h-screen bg-gray-100">
					<div className="container mx-auto px-4">
						<div className="animate-pulse">
							<div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
							<div className="h-4 bg-gray-200 rounded w-1/2 mb-10"></div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								{[1, 2, 3, 4].map((i) => (
									<div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
								))}
							</div>
						</div>
					</div>
				</div>
				<Footer />
			</>
		);
	}

	return (
		<>
			<div className="py-12 min-h-screen bg-gray-100">
				<div className="container mx-auto px-4">
					<div className="mb-10">
						<h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
						<p className="text-gray-600 mt-2">
							Bienvenido al panel de control de Medical Analytics
							{userName ? `, ${userName}` : ""}.
						</p>
					</div>

					{menuItems.length === 0 ? (
						<div className="text-center py-12 bg-white rounded-xl shadow-md">
							<p className="text-gray-500">
								No tienes permisos para acceder a ninguna funcionalidad.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{menuItems.map((item, idx) => (
								<MenuCard
									key={idx}
									icon={item.icon}
									title={item.title}
									description={item.description}
									onClick={() => router.push(item.path)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
}
