import React from "react";
import Header from "@/components/common/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/common/Footer"; // Opcional

export const metadata = {
	title: "Medycal Analytics Laboratory | Gestión de Laboratorio",
	description:
		"Plataforma de administración para gestionar datos personales, solicitudes de servicio y recursos del laboratorio.",
};

export default function Home() {
	return (
		<main className="min-h-screen flex flex-col">
			<Header />
			<HeroSection />
			<FeaturesSection />
			<Footer /> {}
		</main>
	);
}
