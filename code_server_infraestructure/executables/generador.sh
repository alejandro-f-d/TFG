#!/bin/bash

###########################################################

# TODO: Base de datos para la información asociada a los dockers.
# TODO: En caso de dar de baja parcial a un usuario en el sistema, hay que contemplar que no se pise su puerto en uso.
# TODO: Se debe comprobar en la base de datos si el usuario ya tiene un sistema de estos levantado devolver error.
# TODO: Verificación con un watch de que el docker se enciende correctamente y está listo para funcionar.
# TODO: Guardar la contraseña cifrada que meta el usuario en la base de datos.
# TODO: Comprobación de que el usuario que se va a meter no exista ya para evitar problemas con las redirecciones de nginx.
# TODO: Instalación de dependencias en base a un .yml de entrada.
# TODO: Se podría hacer que se empiece a buscar a partir de la última entrada el puerto que se ha usado.
# TODO: Cuando se quite el hardcodeado lo que se debe hacer es consultar a la base de datos cual es el id de la maquina de entrada, ya que lo recibe por nombre como parámetro.

###########################################################

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

primerPuertoLibre() {
	local puerto="$1"
	local cmd=""
	command -v ss >/dev/null 2>&1 && cmd="ss" || cmd="netstat"
	while true; do
		if ! $cmd -tuln | grep -q ":$puerto "; then
			echo "$puerto"
			return 0
		fi
		puerto=$((puerto + 1))
	done
}

anadirServicioDocker() {
	local usuario="$1" password="$2" puerto="$3" grafica="$4" rutaEscritura="$5"

	cat <<EOF >>"$rutaEscritura"

  code_$usuario:
    image: codercom/code-server:latest
    container_name: code_$usuario
    environment:
      - PASSWORD=$password
    volumes:
      - ./data/$usuario:/home/coder/project
    # Expose permite que Nginx lo vea internamente sin abrir el puerto al mundo
    expose:
      - "8080"
    depends_on:
      code_${usuario}_init:
        condition: service_completed_successfully
EOF

	if [ "$grafica" -eq 1 ]; then
		cat <<EOF >>"$rutaEscritura"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: ["gpu"]
EOF
	fi

	cat <<EOF >>"$rutaEscritura"
  code_${usuario}_init:
    image: alpine
    container_name: code_${usuario}_init
    volumes:
      - ./data/$usuario:/target
    command: sh -c "chown -R 1000:1000 /target && chmod -R 755 /target"
EOF
}

anadirUsuarioNginx() {
	local script_dir="$1"
	local usuario="$2"
	local destino="$3"
	local archivo_nginx="$script_dir/../nginx.conf"

	local nueva_linea="        \"$usuario\"    \"http://$destino\";"

	sed -i "/map \$remote_user \$user_backend {/a $nueva_linea" "$archivo_nginx"
}

main() {
	info "Iniciando proceso."
	docker version >/dev/null 2>&1 || {
		error "Docker no instalado."
		exit 1
	}

	if [ $# -ne 4 ]; then
		error "Uso: $0 nombrePersona Contrasena usoGrafica ip"
		exit 2
	fi

	local persona=$1
	local contrasena=$2
	local grafica=$3
	local ip=$4
	local puertoInicioBusqueda=49153
	local script_dir="$(dirname "$(realpath "$0")")"
	local filePassword="$script_dir/../htpasswd"
	local compose_file="$script_dir/../docker-compose.yml"

	[ ! -f "$filePassword" ] && touch "$filePassword"
	info "Generando credenciales..."
	htpasswd -b -B "$filePassword" "$persona" "$contrasena"

	local puertoDondeOperar=$(primerPuertoLibre "$puertoInicioBusqueda")
	info "Asignando puerto interno: $puertoDondeOperar"

	info "Actualizando docker-compose.yml..."
	anadirServicioDocker "$persona" "$contrasena" "$puertoDondeOperar" "$grafica" "$compose_file"

	info "Actualizando pasarela Nginx..."
	anadirUsuarioNginx "$script_dir" "$persona" "code_${persona}:8080"

	info "Reiniciando pasarela Nginx..."
	docker restart nginx_proxy_codeserver

	info "Levantando entorno de $persona..."
	cd "$script_dir/.."
	docker compose up -d "code_${persona}_init"
	docker compose up -d "code_${persona}"

	info "Sistema completado. Acceso por puerto 8458."
}

main "$@"
