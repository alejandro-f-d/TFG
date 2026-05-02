#!/bin/bash
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

##################################################
# TODO: Eliminar del dichero de contraseñas , nginx, docker-compose.
##################################################

info() { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
borrarServiciosDocker() {
	local usuario="${1}"
	if docker compose down -v "code_${usuario}_init" "code_${usuario}"; then
		info "Servicios docker eliminados correctamente."
	else
		warn "No se han encontrado los servicios docker asociados a ese usuario."
	fi
}

main() {
	local persona=$1
	info "Iniciando proceso."
	docker version >/dev/null 2>&1 || {
		error "Docker no instalado."
		exit 1
	}

	if [ $# -ne 1 ]; then
		error "Uso: $0 nombrePersonaRegistrada"
		exit 2
	fi
	info "Borrando servicios docker..."
	borrarServiciosDocker "$persona"
}
main "$@"
