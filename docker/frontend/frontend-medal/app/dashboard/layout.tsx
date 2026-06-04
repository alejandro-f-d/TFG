import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";

export const metadata = {
	title: "MEDAL Dashboard",
	description:
		"Plataforma de administración para gestionar datos personales, solicitudes de servicio y recursos del laboratorio.",
};

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Header />
			<main className="min-h-screen bg-gray-100">{children}</main>
			<Footer />
		</>
	);
}
