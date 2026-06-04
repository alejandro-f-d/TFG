import React from "react";

const features = [
	{
		title: "Gestión de datos",
		description:
			"En la aplicación podrás gestionar tus datos propios y actualizarlos de forma sencilla y segura.",
		icon: "📊",
	},
	{
		title: "Petición de servicios",
		description:
			"Solicita servicios informáticos asociados al laboratorio directamente desde la plataforma.",
		icon: "📝",
	},
	{
		title: "Gestión de Recursos",
		description:
			"Tras la aprobación de las peticiones los recursos serán gestionados.",
		icon: "⚙️",
	},
];

const FeaturesSection = () => {
	return (
		<section className="py-20 bg-white">
			<div className="container mx-auto px-4">
				<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
					{features.map((feature, idx) => (
						<div
							key={idx}
							className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 text-center"
						>
							<div className="text-6xl mb-5 group-hover:scale-110 transition-transform">
								{feature.icon}
							</div>
							<h3 className="text-2xl font-semibold mb-4 text-gray-800">
								{feature.title}
							</h3>
							<p className="text-gray-600 leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default FeaturesSection;
