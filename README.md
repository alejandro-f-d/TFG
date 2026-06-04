[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
# Plataforma web para la gestión de usuarios y servicios asociados en un grupo de investigación
## Descripción
Este Trabajo de Fin de Grado tiene como objetivo mejorar la gestión de usuarios, el inventariado de dispositivos y recursos presentes en el laboratorio, así como los servicios activos en cada máquina.
El sistema proporciona un dashboard web con autenticación basada en roles que centraliza la administración del laboratorio, facilitando la coordinación entre el personal investigador y optimizando el uso de los recursos computacionales disponibles.

## Estructura del repositorio
```text
├── docker/                      # Configuración de despliegue con Docker Compose
├── codigo/                      # Código fuente del proyecto (backend + frontend)
├── memoria/                     # Memoria final del TFG en LaTeX
└── documentacion_cliente/       # Documentación técnica para el cliente
    ├── backend/                 # Documentación del backend y guía de despliegue
    └── code-server/             # Documentación del servicio Code Server
```

## Funcionalidades principales

- Gestión de usuarios con sistema de autenticación y control de acceso basado en roles (RBAC).
- Inventario de dispositivos y recursos: creación, edición y seguimiento del equipamiento del laboratorio.
- Gestión de servicios por máquina: visibilidad de los servicios activos en cada servidor.
- Sistema de calendario: facilita la coordinación y reserva de recursos computacionales según su disponibilidad y capacidad.
- Sistema de peticiones: permite al personal solicitar acceso o uso de recursos en los distintos servidores del sistema, con validación mediante el Digital Signature Service (DSS) de la Comisión Europea.
- Code Server: entornos de desarrollo virtualizados y seguros para el personal investigador, eliminando la necesidad de acceso nativo persistente a las máquinas.


## Despliegue
El proyecto utiliza una arquitectura basada en Docker. Sigue estos pasos para desplegarlo:
Prerrequisitos

Docker instalado
Docker Compose instalado

Pasos

Consulta la documentación de cliente en documentacion_cliente/backend/ y sigue los pasos de configuración previos (variables de entorno, etc.). Para compilar el pdf de información, ejecuta pdflatex main.tex en la carpeta.

Memoria final
Se proporciona un script de compilación automatizado:
```bash
./compilar_memo.sh
```
Documentación del cliente:
Cada carpeta dentro de documentacion_cliente/ contiene su propio main.tex. Compílalos individualmente con pdflatex main.tex desde su respectiva carpeta.

Tecnologías utilizadas


Backend: Node.js 
Frontend: Next.js
Base de datos: PostgreSQL, Redis y Objetos
Infraestructura: Docker, Docker Compose
Documentación: LaTeX
Entornos virtualizados para el personal investigador: Code Server

La infraestructura del dashboard es la siguiente:
![infraestructura](./memoria/imagenes/incremento-ii/infraestructura.png)


👤 Autor
Alejandro Fisac Delgado
Trabajo de Fin de Grado - Escuela Técnica Superior de Ingenieros Informáticos - Universidad Politécnica de Madrid.

📝 Licencia
Este proyecto es de uso académico bajo licencia MIT.
