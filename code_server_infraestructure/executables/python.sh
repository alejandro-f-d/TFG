#!/bin/bash
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

downloadPaquetesFUP() {
	info "Instalando paquetes esenciales y herramientas de terminal..."
	local PAQUETES=(
		curl
		wget
		git
		htop
		btop
		vim
		nano
		net-tools
		iputils-ping
		unzip
		zip
		tar
		build-essential
		tmux
		zsh
		tree
	)
	sudo apt update || error "No se pudieron actualizar los repositorios para la instalación de paquetes."
	sudo apt install -y "${PAQUETES[@]}" || error "Error al instalar los paquetes esenciales."
	info "Herramientas de terminal instaladas."
}

downloadPython() {
	info "Iniciando proceso de descarga de Python."
	sudo apt update || error "Se ha producido un error al actualizar las dependencias del sistema."
	sudo apt upgrade -y || error "Se ha producido un error al actualizar los paquetes del sistema."
	sudo apt install -y python3 python3-pip python3-venv || error "Se ha producido un error al instalar python."
	info "Proceso de instalación python completado con éxito."
}

downloadMiniconda() {

	info "Iniciando la instalación de miniconda."
	local INSTALL_PATH="/miniconda3"
	local TEMP_DIR="/tmp/miniconda_setup"

	(
		mkdir -p "$TEMP_DIR" &&
			wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O "$TEMP_DIR/miniconda.sh" &&
			sudo bash "$TEMP_DIR/miniconda.sh" -b -u -p "$INSTALL_PATH" &&
			rm -rf "$TEMP_DIR"
	) || {
		error "Se ha producido un error de instalación del miniconda."
		return 1
	}

	export PATH="$INSTALL_PATH/bin:$PATH"

	info "Configurando variables de entorno..."
	echo "export PATH=\"$INSTALL_PATH/bin:\$PATH\"" | sudo tee -a /etc/bash.bashrc >/dev/null

	info "Inicializando en el bash."
	sudo "$INSTALL_PATH/bin/conda" init bash

	info "Aceptando términos de servicio..."
	"$INSTALL_PATH/bin/conda" tos accept 2>/dev/null
	info "Instalación del miniconda realizada con éxito."
	conda init
}

main() {
	downloadPaquetesFUP
	downloadPython
	downloadMiniconda
	info "Proceso completo. Reinicia tu terminal."
}

main "$@"
