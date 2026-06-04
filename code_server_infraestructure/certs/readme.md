# Generación de certificados para el code server:
## Certificados autofirmados:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./privkey.pem \
  -out ./fullchain.pem \ 
  -subj "/C=ES/ST=Madrid/L=Madrid/O=MedalProject/CN=127.0.0.1"
```
## Certificados autofirmados + mkcert:
```bash
mkcert code-server-medal.es 192.168.68.77 localhost 127.0.0.1
```
