"use client";

import Image from "next/image";
import Link from "next/link";

const Header = () => {
	return (
		<header className="bg-white shadow-md sticky top-0 z-50">
			<nav className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
				{/* Contenedor Izquierdo: Logo y Nombre */}
				<div className="flex items-center">
					<Link href="/" className="flex items-center space-x-3 group">
						{/* Contenedor del Logo: 
							- w-12 (48px) en móvil 
							- md:w-16 (64px) en pantallas medianas/grandes 
						*/}
						<div className="relative w-12 h-12 md:w-16 md:h-16 transition-transform duration-200 group-hover:scale-105">
							<Image
								src="/logo.png"
								alt="Medical Analytics Laboratory"
								fill
								priority // Carga prioritaria por ser el logo
								className="object-contain"
								sizes="(max-width: 768px) 48px, 64px"
							/>
						</div>

						{/* Texto del Logo:
							- hidden: oculto en móviles muy pequeños
							- sm:inline-block: aparece a partir de pantallas pequeñas
						*/}
						<span className="text-lg md:text-xl font-bold text-gray-800 hidden sm:inline-block leading-tight">
							Medical Analytics <br className="md:hidden" /> Laboratory
						</span>
					</Link>
				</div>

				{/* Contenedor Derecho: Navegación */}
				<div className="flex items-center space-x-4 md:space-x-8">
					<Link
						href="https://www.ctb.upm.es/"
						className="text-sm md:text-base text-gray-600 hover:text-blue-600 font-medium transition"
					>
						CTB
					</Link>
					<Link
						href="http://138.4.92.136:8095/"
						className="text-sm md:text-base text-gray-600 hover:text-blue-600 font-medium transition"
					>
						DockerFile generator
					</Link>
					<Link
						href="https://medal.ctb.upm.es/"
						className="text-sm md:text-base text-gray-600 hover:text-blue-600 font-medium transition"
					>
						Sobre Nosotros
					</Link>
					<Link
						href="http://138.4.92.136:8087/"
						className="text-sm md:text-base text-gray-600 hover:text-blue-600 font-medium transition"
					>
						Medal Wiki
					</Link>

					<Link
						href="/auth/signin"
						className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm font-semibold text-sm md:text-base"
					>
						Sign in
					</Link>
				</div>
			</nav>
		</header>
	);
};

export default Header;
