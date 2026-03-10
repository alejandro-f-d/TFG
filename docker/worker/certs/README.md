Para el proceso de la generación de documentos de las peticiones se va a utilizar un sistema de firmas de la siguiente manera:

1. El servidor realiza la primera firma al documento con su certificado.
2. El usuario realiza la firma.
3. El supervisor realiza la firma.
4. El jefe realiza la firma.

Para ello se necesita el certificado que se va a crear de la siguiente manera, cabe destacar que este certificado es autofirmado por el servidor que no responde ante terceros como un certificado seguro.
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=ES/ST=Madrid/L=Madrid/O=UPM/OU=CTB/CN=Servidor MEDAL"
openssl pkcs12 -export -out sello_servidor.p12 -inkey key.pem -in cert.pem -keypbe AES-256-CBC -certpbe AES-256-CBC -passout pass:
# Validación:
openssl pkcs12 -info -in sello_servidor.p12 -passin pass: -noout
```
