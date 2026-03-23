# Servicio de @FIRMA:
En esta carpeta debe estar presente los contenidos relativos al servicio de @firma del Gobierno de España. 
La descarga de este servicio se puede realizar de la siguiente manera: ([Enlace persistente](https://administracionelectronica.gob.es/ctt/clienteafirma/descargas)). Se descarga todo lo relativo a la versión 1.9.
La descarga será de los siguientes ficheros:

```
Autoscript v1.9 (53  KB · ZIP)
afirma-server-triphase-signer-2.9 (14568  KB · ZIP)
afirma-signature-storage-1.10 (10  KB · ZIP)
afirma-signature-retriever-1.10 (9  KB · ZIP)
```

La estructura resultante debe ser la siguiente:
```bash
.
├── front-end-firma
│   └── Autoscript v1-9
│       └── Despliegue
│           ├── clienteafirma-batch-json.html
│           ├── clienteafirma-test.html
│           └── js
│               └── autoscript.js
├── README.md
├── war-despliegue
│   ├── afirma-server-triphase-signer-2.9.war
│   ├── afirma-signature-retriever-1.10.war
│   ├── afirma-signature-storage-1.10.war
│   └── tps_config.properties
└── zip-estado
    ├── afirma-server-triphase-signer-2-9.zip
    ├── afirma-signature-retriever-1-10.zip
    ├── afirma-signature-storage-1-10.zip
    └── Autoscript v1-9.zip

7 directories, 12 files

```

Métodos de cada una de las cosas:
  Para ver más claro cada uno de los métodos que tienen los war se hace lo siguiente:
```bash
docker exec afirma_server cat /usr/local/tomcat/webapps/afirma-server-triphase-signer-2.9/WEB-INF/web.xml
docker exec afirma_server cat /usr/local/tomcat/webapps/afirma-signature-storage-1.10/WEB-INF/web.xml
```
