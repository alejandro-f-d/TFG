import React from "react";
import Link from "next/link";

const Footer = () => {
	return (
		<footer className="bg-gray-800 text-white py-8">
			<div className="container mx-auto px-4 text-center">
				<p className="text-sm">
					&copy; {new Date().getFullYear()} Medycal Analytics Laboratory. Todos
					los derechos reservados.
				</p>
			</div>
		</footer>
	);
};

export default Footer;
