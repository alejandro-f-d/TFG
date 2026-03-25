import Image from "next/image";
import React from "react";

interface MenuCardProps {
	icon: string; // emoji o ruta de imagen
	title: string;
	description?: string;
	onClick?: () => void;
	className?: string;
}

const MenuCard: React.FC<MenuCardProps> = ({
	icon,
	title,
	description,
	onClick,
	className = "",
}) => {
	const isImage = icon.startsWith("/") || icon.startsWith("http");

	return (
		<div
			onClick={onClick}
			className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer p-6 text-center ${className}`}
		>
			<div className="flex justify-center mb-4">
				{isImage ? (
					<div className="relative w-16 h-16">
						<Image
							src={icon}
							alt={title}
							fill
							className="object-contain"
							sizes="64px"
						/>
					</div>
				) : (
					<span className="text-5xl">{icon}</span>
				)}
			</div>
			<h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
			{description && <p className="text-sm text-gray-600">{description}</p>}
		</div>
	);
};

export default MenuCard;
