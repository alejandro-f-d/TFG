# Generación de certificados para el code server:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./privkey.pem \
  -out ./fullchain.pem \ 
  -subj "/C=ES/ST=Madrid/L=Madrid/O=MedalProject/CN=127.0.0.1"
```
