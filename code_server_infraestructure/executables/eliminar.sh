#!/bin/bash
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="./../docker-compose.yml"
NGINX_FILE="./../nginx.conf"
HTPASSWD_FILE="./../htpasswd"

info() { echo -e "${BLUE}[INFO]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $1"; }
error() { echo -e "${RED}[ERROR]${NC}  $1" >&2; }

borrarServiciosDocker() {
	local usuario="${1}"
	local serv1="code_${usuario}"
	local serv2="code_${usuario}_init"

	info "Deteniendo y eliminando contenedores y volúmenes de ${usuario}..."
	docker compose stop "$serv1" "$serv2" >/dev/null 2>&1
	docker compose down -f -v "$serv1" "$serv2" >/dev/null 2>&1

	info "Eliminando líneas del archivo docker-compose.yml..."
	if yq -i -y "del(.services.${serv1}, .services.${serv2})" "$COMPOSE_FILE"; then
		info "Servicios eliminados del YAML correctamente."
	else
		error "No se pudo editar el archivo docker-compose.yml."
	fi
}

borrarServiciosNginx() {
	local usuario="${1}"

	info "Eliminando usuario ${usuario} del bloque map en nginx.conf..."
	if sed -i "/map \$remote_user \$user_backend {/,/}/ { /\"${usuario}\"/d; }" "$NGINX_FILE"; then
		info "Configuración de Nginx actualizada."
		docker compose exec -T nginx_proxy nginx -s reload >/dev/null 2>&1
		info "Nginx recargado."
	else
		error "No se pudo editar nginx.conf."
	fi
}

borrarPassword() {
	local usuario="${1}"

	if [ -f "$HTPASSWD_FILE" ]; then
		info "Eliminando credenciales de ${usuario}..."
		if htpasswd -D "$HTPASSWD_FILE" "$usuario" >/dev/null 2>&1; then
			info "Usuario eliminado del archivo de contraseñas."
		else
			warn "El usuario ${usuario} no existía en htpasswd."
		fi
	else
		error "No se encontró el archivo htpasswd en $HTPASSWD_FILE"
	fi
}

main() {
	local persona=$1

	if [ $# -ne 1 ]; then
		error "Uso: $0 nombrePersonaRegistrada"
		exit 2
	fi

	docker version >/dev/null 2>&1 || {
		error "Docker no está funcionando. Abortando."
		exit 1
	}

	info "Iniciando proceso."
	borrarServiciosDocker "$persona"
	borrarServiciosNginx "$persona"
	borrarPassword "$persona"

	info "Proceso finalizado."
}

main "$@"
