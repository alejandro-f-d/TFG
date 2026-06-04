import React from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/common/Footer";
import HealthHeroSection from "@/components/health/HeroSection";

export const metadata = {
	title: "Medical Analytics Laboratory | Gestión de Laboratorio",
	description:
		"Plataforma de administración para gestionar datos personales, solicitudes de servicio y recursos del laboratorio.",
};

export default function Home() {
	return (
		<main className="min-h-screen flex flex-col">
			<Header />
			<HealthHeroSection />
			<Footer /> {}
		</main>
	);
}
