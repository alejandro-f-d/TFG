import Cookies from "js-cookie";

export const logout = () => {
	Cookies.remove("token", { path: "/" });

	localStorage.clear();

	window.location.href = "/auth/signin";
};
