# Proceso de instalación: 

## Autoridad de Certificación:

> ***IMPORTANTE***: Solo se necesita una autoridad de certificación para todos los code-servers. 

----

En primer lugar se debe instalar la parte de la Autoridad de certificación y generación de certificados. Para ello, sigue los pasos presente en `./CA/readme.md`. Una vez se tiene el certificado para la página web debe estar presente en `./certs/` con los siguientes nombres:

  - Para el certificado ***code-server-fullchain.crt***. 
  - Para la clave privada ***code-server.key***.

Como en el anterior readme, se debe compartir el certificado de la CA raíz para que el usuario final valide la conexión. 

----

## Instalación del nginx + Dozzle: 

Esta es la primera parte de la instalación del servicio. Situarnos en la misma carpeta que el readme.md y ejecutar: `(sudo) docker compose up -d`. Con esto levantaremos dos dockers principales el nginx con proxy inverso encargado de la redirección de los usuarios y el Dozzle una herramienta de monitorización de los servicios docker y las herramientas en ejecución. Para la conexión del Dozzle el usuario y contraseña por defecto es medal. Para cambiar las password mirar los siguientes capítulos. 

### Generación de nuevos usuarios en el sistema:
Para generar nuevos usuarios en el sistema se proporciona el script `./executables/generador.sh` que solicita tres parametrós de la siguiente manera.

```bash
cd ./executables/ 
chmod +x generador.sh # Otorgamos permisos de ejecución al usuario actual.
./generador.sh nombre password grafica
```

Es importante saber que los nombres de usuario deben ser únicos y exclusivos en la máquina donde se ejecuta. Para el campo gráfica existen 2 valores, 0: Carece de permisos de gráfica. 1: Accede a la gráfica. 

Con este mandato se habrán instalado de manera automática dependencias python con conda y las dependencias más usuales.

Para el usuario tener terminada la instalación del conda correctamente debe hacer conda activate y reiniciar su terminal.

## Parada sin borrado del servicio de un usuario:

```bash
docker compose stop code_nombre
```

## Eliminación del servicio de un usuario:

**AVISO**: Esto borra los datos del usuario en su totalidad.
Debe ejecutarse desde la carpeta `./executables/`.
```bash
cd ./executables/ 
chmod +x eliminar.sh
./eliminar.sh nombre
```
nombre es el nombre de usuario de las operaciones. Esta acción es irreversible y provoca la eliminación del servicio.  


# Preguntas frecuentes: 

## Cambio de contraseña:

El cambio de contraseña existe a tres niveles.

1. A nivel del nginx con el proxy inverso.
2. A nivel code-server con el login único de password. 
3. A nivel terminal. 

### Proxy inverso:

En la carpeta raíz (donde se ubica este readme.md) ejecutar lo siguiente:

```bash
htpasswd htpasswd nombre
```
Esto te pedirá una nueva contraseña para el usuario nombre.

### Code-server login con solo password:
Para el cambio de esta contraseña se debe hacer lo siguiente:
En la carpeta raíz (donde se ubica este readme.md) ejecutar lo siguiente:
```bash
docker compose stop code_nombre
nano docker-compose.yml # Edición del coder y del campo password asociado al usuario.
docker compose up code_nombre
```
Con esto se modificaría la contraseña del coder.
**ADVERTENCIA**: Al parar el docker, todos los procesos en ejecución se paran.

### Terminal:
El propio usuario la puede modificar con los procesos normales de terminal bash.


> ***Consejo***: Es interesante que para evitar confusiones las tres contraseñas sean las mismas que es como lo deja el generador. 





