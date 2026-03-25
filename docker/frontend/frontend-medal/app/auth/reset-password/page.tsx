import ResetPasswordForm from "@/components/recovery/ResetPasswordForm";
import { Suspense } from "react";

export const metadata = {
	title: "Restablecer contraseña | Medycal Analytics Laboratory",
};

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					Cargando...
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}
