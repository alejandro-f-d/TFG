"use client";

import Image from "next/image";
import React from "react";

interface MenuCardProps {
	icon: string;
	title: string;
	description?: string;
	onClick?: () => void;
	className?: string;
	disabled?: boolean;
}

const MenuCard: React.FC<MenuCardProps> = ({
	icon,
	title,
	description,
	onClick,
	className = "",
	disabled = false,
}) => {
	const isImage =
		icon.startsWith("/") ||
		icon.startsWith("http") ||
		icon.startsWith("data:image");

	// Determina si necesita optimización (solo URLs locales con next/image)
	const needsOptimization = icon.startsWith("/") && !icon.startsWith("data:");

	const handleClick = () => {
		if (!disabled && onClick) {
			onClick();
		}
	};

	return (
		<div
			onClick={handleClick}
			className={`
        bg-white rounded-xl shadow-md hover:shadow-lg transition-all 
        ${!disabled ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-60"}
        p-6 text-center
        ${className}
      `}
		>
			<div className="flex justify-center mb-4">
				{isImage ? (
					<div className="relative w-16 h-16">
						{needsOptimization ? (
							<Image
								src={icon}
								alt={title}
								fill
								className="object-contain"
								sizes="64px"
							/>
						) : (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={icon}
								alt={title}
								className="w-full h-full object-contain"
							/>
						)}
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
