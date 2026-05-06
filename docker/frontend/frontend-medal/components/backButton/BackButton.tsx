"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
	const router = useRouter();

	return (
		<button
			onClick={() => router.back()}
			className="group flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-all duration-300"
		>
			<span className="group-hover:-translate-x-1 transition-transform">←</span>
			Volver
		</button>
	);
}
