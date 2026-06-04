import React from "react";

const HeroSection = () => {
	return (
		<section className="relative bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="container mx-auto px-4 py-20 md:py-28 text-center">
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
					Página web Administración
				</h1>
				<p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto">
					Gestiona tus solicitudes de servicio, información personal y recursos
					de manera eficiente.
				</p>
			</div>
		</section>
	);
};

export default HeroSection;
