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
mkdir certs db private
chmod 700 private
touch db/index
openssl rand -hex 16  > db/serial
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
openssl req -new \
  -config root-ca.conf \
  -out medal-root-ca.csr \
  -keyout private/medal-root-ca.key
```

Autofirma del certificado de la CA:
```bash
openssl ca -selfsign \
    -config root-ca.conf \
    -in medal-root-ca.csr \
    -out medal-root-ca.crt \
    -extensions ca_ext
```

Creación de la lista de certificados revocados:
```bash
openssl ca -gencrl \
    -config root-ca.conf \
    -out root-ca.crl
```

Para el tfg no es necesario una ca intermedia luego se podrían firmar ya certificados con esta CA:

# Firma de una nueva solicitud:

Desde la carpeta `./root-ca/`
```bash
openssl ca -config root-ca.conf \
    -in requests/atenea.csr \
    -out certs/atenea.crt \
    -extensions server_ext \
    -extfile <(printf "[server_ext]\nsubjectAltName=IP:192.168.68.77")
```
# Creación de una solicitud por parte del cliente: 

## Petición:
```bash
openssl req -new -newkey rsa:4096 -nodes \
    -keyout atenea.key \
    -out atenea.csr \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=MEDAL/CN=192.168.68.77"
```
## Verificación:
```bash
openssl req -in atenea.csr -noout -text
```


# Fichero a compartir para la confianza:
`medal-root-ca.crt`.
