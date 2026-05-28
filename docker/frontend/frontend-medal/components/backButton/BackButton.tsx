"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
	const router = useRouter();

	return (
		<button
			type="button"
			onClick={() => router.back()}
			className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 px-6 py-3 rounded-2xl text-[11px] font-black text-slate-700 uppercase tracking-[0.25em] transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-4 w-4 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all duration-300 stroke-[3]"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			<span className="group-hover:text-blue-600 transition-colors duration-300">
				Volver
			</span>
		</button>
	);
}
