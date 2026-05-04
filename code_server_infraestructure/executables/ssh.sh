#!/bin/bash
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

install_ssh() {
	info "Iniciando la instalación y configuración de OpenSSH Server..."

	if apt-get update && apt-get install -y openssh-server; then
		info "Paquete openssh-server instalado correctamente."
	else
		error "Fallo al instalar openssh-server. Verifica la conexión a internet."
		return 1
	fi

	mkdir -p /var/run/sshd

	sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
	sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

	USER_HOME="/home/coder"
	mkdir -p "$USER_HOME/.ssh"
	chmod 700 "$USER_HOME/.ssh"
	chown -R 1000:1000 "$USER_HOME/.ssh"

	info "Generando llaves de host SSH..."
	ssh-keygen -A

	if /usr/sbin/sshd; then
		info "Servidor SSH iniciado correctamente en el puerto 22 (interno)."
	else
		error "No se pudo iniciar el demonio sshd."
		return 1
	fi

}

cambioPassword() {
	warn "Cambio de contraseña solicitado para el usuario $(coder), esto no modifica la password del login vía web nginx."
	sudo passwd coder
}

main() {
	info "Iniciando proceso de instalación del ssh."
	install_ssh
	cambioPassword
	info "Proceso completo."
}

main "$@"
