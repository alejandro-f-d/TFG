# Generación de los certificados para https:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=medal-web-server"
```
