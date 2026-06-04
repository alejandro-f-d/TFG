Para la validación de las firmas se sigue el siguiente proceso y uso del Dockerfile proporcionado por la comisión Europea. [Repositorio de Github](https://github.com/esig/dss-demonstrations)
Para ello, se ejecuta el proceso docker especificado en el repositorio. Una vez se tiene la imagen se exporta a un .tar de la siguiente manera:

```bash
docker save -o dss.tar dss-demo
```

Tras esto, se lleva el tar al servidor donde se quiere ejecutar la plataforma y se carga como imagen el tar.

```bash
docker load -i dss.tar
```

Una vez se tiene la imagen cargada en el sistema docker, el sistema se puede desplegar con normalidad.
