# Pasos para la creación de una CA:
## Creación del `root-ca.conf`.
```bash
[default]
name                    = medal-root-ca
domain_suffix           = medal-root-ca.local
aia_url                 = http://$name.$domain_suffix/$name.crt
crl_url                 = http://$name.$domain_suffix/$name.crl
ocsp_url                = http://ocsp.$name.$domain_suffix:9080
default_ca              = ca_default
name_opt                = utf8,esc_ctrl,multiline,lname,align

[ca_dn]
countryName             = "ES"
organizationName        = "MEDAL"
commonName              = "MEDAL Root CA"

[ca_default]
home                    = .
database                = $home/db/index
serial                  = $home/db/serial
crlnumber               = $home/db/crlnumber
certificate             = $home/$name.crt
private_key             = $home/private/$name.key
RANDFILE                = $home/private/random
new_certs_dir           = $home/certs
unique_subject          = no
copy_extensions         = none
default_days            = 3650
default_crl_days        = 365
default_md              = sha256
policy                  = policy_c_o_match

[policy_c_o_match]
countryName             = match
stateOrProvinceName     = optional
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[req]
default_bits            = 4096
encrypt_key             = yes
default_md              = sha256
utf8                    = yes
string_mask             = utf8only
prompt                  = no
distinguished_name      = ca_dn
req_extensions          = ca_ext

[ca_ext]
basicConstraints        = critical,CA:true
keyUsage                = critical,keyCertSign,cRLSign
subjectKeyIdentifier    = hash

[sub_ca_ext]
authorityInfoAccess     = @issuer_info
authorityKeyIdentifier  = keyid:always
basicConstraints        = critical,CA:true,pathlen:0
crlDistributionPoints   = @crl_info
extendedKeyUsage        = clientAuth,serverAuth
keyUsage                = critical,keyCertSign,cRLSign
nameConstraints         = @name_constraints
subjectKeyIdentifier    = hash

[crl_info]
URI.0                   = $crl_url

[issuer_info]
caIssuers;URI.0         = $aia_url
OCSP;URI.0              = $ocsp_url

[name_constraints]
permitted;DNS.0=8.8.8.8
permitted;DNS.1=1.1.1.1
excluded;IP.0=0.0.0.0/0.0.0.0
excluded;IP.1=0:0:0:0:0:0:0:0/0:0:0:0:0:0:0:0

[ocsp_ext]
authorityKeyIdentifier  = keyid:always
basicConstraints        = critical,CA:false
extendedKeyUsage        = OCSPSigning
keyUsage                = critical,digitalSignature
subjectKeyIdentifier    = hash
```
## Estructura de directorios:
```bash
mkdir root-ca
cd root-ca
mkdir certs db private requests
chmod 700 private

touch db/index
openssl rand -hex 16 > db/serial
echo 1001 > db/crlnumber
```
certs: 
  Donde se generan los nuevos certificados.
db:
  Indeex para los certificados y validez.
private:
  Se encuentran las claves privadas.

## Root CA Generation:
Generación del key y del csr (solicitud de firma).

```bash
openssl req -new -x509 -config root-ca.conf \
    -keyout private/medal-root-ca.key \
    -out medal-root-ca.crt \
    -extensions ca_ext -days 3650
```

Creación de la lista de certificados revocados:
```bash
openssl ca -gencrl \
    -config root-ca.conf \
    -out root-ca.crl
```

Para el tfg no es necesario una ca intermedia luego se podrían firmar ya certificados con esta CA:

# Creación de una solicitud por parte del cliente: 

## Petición:
### Generación del par clave público-privada:

```bash
openssl req -new -newkey rsa:4096 -nodes \
    -keyout requests/atenea.key \
    -out requests/atenea.csr \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=MEDAL/CN=192.168.68.75"
```

### Verificación:
```bash
openssl req -in requests/atenea.csr -noout -text
```



# Firma de una nueva solicitud:

Desde la carpeta `./root-ca/`
```bash
openssl ca -config root-ca.conf \
    -in requests/atenea.csr \
    -out certs/atenea.crt \
    -extensions server_ext \
    -extfile <(printf "[server_ext]\nsubjectAltName=IP:192.168.68.75\nextendedKeyUsage=serverAuth\nkeyUsage=digitalSignature,keyEncipherment\nbasicConstraints=CA:FALSE") \
    -batch
```
```bash
cat certs/atenea.crt medal-root-ca.crt > certs/atenea-fullchain.crt
```

# Fichero a compartir para la confianza:
`medal-root-ca.crt`.
## Cómo añadir el certificado a confianza:
### Linux (Ubuntu):
```bash
sudo cp medal-root-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
ls -l /etc/ssl/certs/ | grep medal-root-ca # Verificación de los certificados.
```
### Windows:
Doble click en el certificado, instalar certificado, seleccionar ruta, Colocar todos los certificados en el siguiente almacén, Autoridades de certificación de raíz de confianza, aceptar.

### Fedora:
```bash
sudo cp medal-root-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
# Ejemplo de verificación en base a un certificado
openssl verify -CAfile /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem root-ca/certs/atenea.crt 
sudo cp medal-root-ca.crt /usr/local/share/ca-certificates/
```
