// components/users/UserList.tsx
"use client";

import { FilterableList } from "@/components/common/FilterableList";
import UserCard from "./UserCard";
import { useRouter } from "next/navigation";

interface User {
	idusuario: number;
	uuidusuario: string; // ← Asegurar que existe
	nombre: string;
	apellido1: string;
	apellido2: string;
	correoinstitucional: string;
	activo: boolean;
	esresponsable: boolean;
	roles?: { id: number; nombre: string }[];
	[key: string]: any;
}

interface UserListProps {
	onEditUser?: (uuid: string) => void; // ← Cambiar de userId (número) a uuid (string)
}

const fetchUsers = async (page: number, limit: number, filter: string) => {
	const token = localStorage.getItem("token");
	if (!token) throw new Error("No autenticado");

	const apiUrl = process.env.NEXT_PUBLIC_API_URL;
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
	});
	if (filter) params.append("filtroNombre", filter);

	const res = await fetch(`${apiUrl}/api/user?${params.toString()}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (res.status === 403) {
		throw new Error("No tienes permiso para ver usuarios");
	}
	if (!res.ok) {
		throw new Error("Error al cargar usuarios");
	}

	const data = await res.json();
	return {
		items: data.info || [],
		pagination: data.pagination || {
			totalItems: 0,
			totalPages: 0,
			currentPage: page,
		},
	};
};

const UserList: React.FC<UserListProps> = ({ onEditUser }) => {
	const router = useRouter();

	const handleUserClick = (uuid: string) => {
		if (onEditUser) {
			onEditUser(uuid);
		} else {
			router.push(`/dashboard/usuarios/${uuid}`);
		}
	};

	return (
		<FilterableList<User>
			fetchData={fetchUsers}
			renderItem={(user: User) => (
				<UserCard
					key={user.uuidusuario}
					user={user}
					onClick={() => handleUserClick(user.uuidusuario)}
				/>
			)}
			placeholder="Buscar por nombre (Ej. Alejandro)"
			emptyMessage="No se encontraron usuarios."
			limit={5}
			itemKey={(user) => user.uuidusuario}
		/>
	);
};

export default UserList;
