import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";

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
