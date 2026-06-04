#!/bin/bash
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC}  $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

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
    expose:
      - "8080"
    depends_on:
      code_${usuario}_init:
        condition: service_completed_successfully
    restart: unless-stopped
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

copy_user_scripts() {
	local nombreUsuario=$1
	local SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
	local target_dir="$SCRIPT_DIR/data/${nombreUsuario}"
	info "Preparando la sincronización de scripts para el usuario: ${nombreUsuario}."
	until [ -d "$target_dir" ]; do
		warn "Directorio de destino no encontrado en: $target_dir. Reintentando."
		sleep 2
	done

	info "Directorio detectado en: $target_dir"
	local src_python="$SCRIPT_DIR/executables/python.sh"
	local src_ssh="$SCRIPT_DIR/executables/ssh.sh"
	local success=true
	for file_path in "$src_python" "$src_ssh"; do
		local file_name=$(basename "$file_path")
		if [ -f "$file_path" ]; then
			if cp "$file_path" "$target_dir/"; then
				chown 1000:1000 "$target_dir/$file_name"
				chmod +x "$target_dir/$file_name"
				info "Archivo [$file_name] copiado y configurado con éxito."
			else
				error "Error crítico al intentar copiar $file_name a $target_dir."
				success=false
			fi
		else
			error "No se encuentra el archivo fuente: $file_path"
			success=false
		fi
	done
	[ "$success" = true ] || error "Error al hacer la copia de archivos."
	if docker exec -it -u coder code_"${nombreUsuario}" sudo /home/coder/project/ssh.sh; then
		info "Instalado de manera correcta el sistema ssh."
	else
		error "Se ha producido un error al instalar el ssh."
	fi

	if docker exec -it -u coder code_"${nombreUsuario}" sudo /home/coder/project/python.sh; then
		info "Instalado de manera correcta el sistema python."
	else
		error "Se ha producido un error al instalar el ssh."
	fi
	docker exec -it code_"${nombreUsuario}" bash -c "/miniconda3/bin/conda init bash"
	info "Instalación correcta."

}

main() {
	info "Iniciando proceso."
	docker version >/dev/null 2>&1 || {
		error "Docker no instalado."
		exit 1
	}

	if [ $# -ne 3 ]; then
		error "Uso: $0 nombrePersona Contrasena usoGrafica"
		exit 2
	fi

	local persona=$1
	local contrasena=$2
	local grafica=$3
	local script_dir="$(dirname "$(realpath "$0")")"
	local filePassword="$script_dir/../htpasswd"
	local compose_file="$script_dir/../docker-compose.yml"

	if [ -f "$compose_file" ] && grep -q "code_${persona}:" "$compose_file"; then
		error "El usuario '$persona' ya existe en el docker-compose.yml."
		exit 3
	fi

	[ ! -f "$filePassword" ] && touch "$filePassword"
	info "Generando credenciales..."
	htpasswd -b -B "$filePassword" "$persona" "$contrasena"

	info "Actualizando docker-compose.yml..."
	anadirServicioDocker "$persona" "$contrasena" "$puertoDondeOperar" "$grafica" "$compose_file"

	info "Actualizando pasarela Nginx..."
	anadirUsuarioNginx "$script_dir" "$persona" "code_${persona}:8080"

	info "Reiniciando pasarela Nginx..."
	if docker compose restart nginx_proxy >/dev/null 2>&1; then
		info "NGINX reiniciado de manera correcta."
	else
		error "Se ha producido un error al reiniciar el nginx."
	fi
	info "Levantando entorno de $persona..."
	cd "$script_dir/.."
	docker compose up -d "code_${persona}_init"
	docker compose up -d "code_${persona}"
	info "Iniciando la copia de los ficheros."
	copy_user_scripts "$persona"
	info "Sistema completado. Acceso a través del nginx."

}

main "$@"
