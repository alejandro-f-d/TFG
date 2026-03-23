# Servicio de @FIRMA:
En esta carpeta debe estar presente los contenidos relativos al servicio de @firma del Gobierno de España. 
La descarga de este servicio se puede realizar de la siguiente manera: ([Enlace persistente](https://administracionelectronica.gob.es/ctt/clienteafirma/descargas))

```bash
curl https://administracionelectronica.gob.es/ctt/resources/Soluciones/138/Descargas/Autoscript%20v1-9.zip?idIniciativa=138&idElemento=28934
unzip Autoscript\ v1-9.zip
```

Esta descarga, nos genera una carpeta "Despliegue" que contiene los ficheros relativos a la firma.

La estructura de directorios es la siguiente:

```bash
.
├── clienteafirma-batch-json.html
├── clienteafirma-test.html
└── js
    └── autoscript.js

2 directories, 3 files
```
