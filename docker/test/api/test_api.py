import requests
import pytest

class TestGestionUsuarios:
    # Configuración de URLs
    BASE_URL_USER = "http://localhost:8080/api/user"
    LOGIN_URL = "http://localhost:8080/api/user/login"
    BASE_URL_MAQUINA = "http://localhost:8080/api/maquina"
    
    # Variables de clase para persistir datos entre tests
    token_admin = None
    token_role_2 = None
    token_sin_roles = None
    
    uuid_user_sin_roles = None
    uuid_user_role_2 = None
    uuid_maquina_creada = None

    # --- BLOQUE 1: AUTENTICACIÓN (LOGIN) ---

    def test_01_login_incorrecto(self):
        """Caso: Credenciales erróneas. Se espera 401."""
        payload = {
            "correoInstitucional": "alejandro.fisac.contact@gmail.com",
            "contrasena": "password_incorrecto"
        }
        res = requests.post(self.LOGIN_URL, json=payload)
        assert res.status_code == 401
        print("\n✅ Seguridad de login validada (401 ante error).")

    def test_02_login_admin_exitoso(self):
        """Caso: Login para obtener token de administrador."""
        payload = {
            "correoInstitucional": "alejandro.fisac.contact@gmail.com",
            "contrasena": "afisac"
        }
        res = requests.post(self.LOGIN_URL, json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        TestGestionUsuarios.token_admin = data["token"]
        print(f"✅ Login admin exitoso. Token obtenido.")

# --- BLOQUE 2: GESTIÓN DE USUARIOS (POST) ---

    def test_03_post_usuario_sin_permisos(self):
        """Caso: Crear usuario sin roles y capturar UUID (Multiclave)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombre": "User", "apellido1": "Sin", "apellido2": "Permisos",
            "correoInstitucional": "user.sin.permisos@test.com",
            "profesorResponsable": 1, "fechaIncorporacion": "2026-02-23",
            "fechaFin": "2027-02-23", "wifi": True, "activo": True,
            "tarjetaAcceso": "T-00000", "teams": False, "jefeLaboratorio": False,
            "esResponsable": False, "roles": [3], "puertasAutorizadas": [],
            "duenoMaquina": [], "contrasena": "test"
        }
        res = requests.post(self.BASE_URL_USER, json=payload, headers=headers)
        assert res.status_code in [201, 200]
        
        data = res.json()
        # Intentamos capturar de cualquier clave posible
        uid = data.get("uuid") or data.get("id") or (data.get("info", {}) if isinstance(data.get("info"), dict) else {}).get("uuid")
        
        # PLAN B: Si el POST no lo dio, lo buscamos en el listado por correo
        if not uid:
            r_list = requests.get(f"{self.BASE_URL_USER}/", headers=headers)
            lista = r_list.json() if isinstance(r_list.json(), list) else r_list.json().get("info", [])
            uid = next((u.get("uuid") or u.get("id") for u in lista if u.get("correoInstitucional") == "user.sin.permisos@test.com"), None)

        TestGestionUsuarios.uuid_user_sin_roles = uid
        assert TestGestionUsuarios.uuid_user_sin_roles is not None, f"No se pudo obtener el UUID. Respuesta: {data}"
        print(f"✅ Usuario sin permisos UUID: {TestGestionUsuarios.uuid_user_sin_roles}")

    def test_04_post_usuario_role_2(self):
        """Caso: Crear usuario Alejandro y capturar UUID (Multiclave)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombre": "Alejandro", "apellido1": "Fisac", "apellido2": "Delgado",
            "correoInstitucional": "alejandro.nuevo.test@test.com",
            "profesorResponsable": 1, "fechaIncorporacion": "2026-02-16",
            "fechaFin": "2027-02-16", "wifi": True, "activo": True,
            "tarjetaAcceso": "A-88923", "teams": True, "jefeLaboratorio": False,
            "esResponsable": False, "roles": [2], "puertasAutorizadas": [1],
            "duenoMaquina": [1, 2], "contrasena": "test"
        }
        res = requests.post(self.BASE_URL_USER, json=payload, headers=headers)
        assert res.status_code in [201, 200]
        
        data = res.json()
        uid = data.get("uuid") or data.get("id") or (data.get("info", {}) if isinstance(data.get("info"), dict) else {}).get("uuid")

        # PLAN B: Buscar en listado si el POST falló en dar el ID
        if not uid:
            r_list = requests.get(f"{self.BASE_URL_USER}/", headers=headers)
            lista = r_list.json() if isinstance(r_list.json(), list) else r_list.json().get("info", [])
            uid = next((u.get("uuid") or u.get("id") for u in lista if u.get("correoInstitucional") == "alejandro.nuevo.test@test.com"), None)

        TestGestionUsuarios.uuid_user_role_2 = uid
        assert TestGestionUsuarios.uuid_user_role_2 is not None
        print(f"✅ Usuario Alejandro UUID: {TestGestionUsuarios.uuid_user_role_2}")
    def test_05_logins_usuarios_nuevos(self):
        """Obtener tokens para los usuarios creados."""
        # Token Role 2
        r2 = requests.post(self.LOGIN_URL, json={"correoInstitucional": "alejandro.nuevo.test@test.com", "contrasena": "test"})
        TestGestionUsuarios.token_role_2 = r2.json().get("token")
        
        # Token Sin Roles
        rs = requests.post(self.LOGIN_URL, json={"correoInstitucional": "user.sin.permisos@test.com", "contrasena": "test"})
        TestGestionUsuarios.token_sin_roles = rs.json().get("token")
        
        assert self.token_role_2 and self.token_sin_roles
        print("✅ Tokens de usuarios nuevos obtenidos correctamente.")

    # --- BLOQUE 3: GESTIÓN DE MÁQUINAS (POST) ---

    def test_06_post_crear_servidor_role_2(self):
        """Caso: El usuario Role 2 crea una máquina servidor."""
        headers = {"Authorization": f"Bearer {self.token_role_2}"}
        payload = {
            "nombre": "Servidor-Procesamiento-01",
            "caducidadSsl": "2026-12-31", "certificadoSslActivo": True,
            "emisorSsl": "Let's Encrypt",
            "red": { 
                "direccionIpPrivadaV4": "10.0.0.5", "direccionIpPublicaV4": "80.24.152.10",
                "direccionIpPrivadaV6": "fd00::1", "direccionIpPublicaV6": "2001:db8::1",
                "puertaEnlaceV4": "10.0.0.1", "puertaEnlaceV6": "fe80::1"
            },
            "especificaciones": { 
                "sistemaOperativo": "Ubuntu 24.04", "ram": 32, "esServidor": True 
            }
        }
        res = requests.post(self.BASE_URL_MAQUINA, json=payload, headers=headers)
        assert res.status_code in [200, 201]
        
        data = res.json()
        TestGestionUsuarios.uuid_maquina_creada = data.get("uuid")
        assert self.uuid_maquina_creada is not None
        print(f"✅ Máquina creada con UUID: {self.uuid_maquina_creada}")

    def test_07_seguridad_post_maquina(self):
        """Caso: Usuario sin roles no puede crear máquinas (403)."""
        headers = {"Authorization": f"Bearer {self.token_sin_roles}"}
        res = requests.post(self.BASE_URL_MAQUINA, json={"nombre": "Ilegal"}, headers=headers)
        assert res.status_code == 403
        print("✅ Seguridad validada: Acceso denegado a usuario sin permisos.")

    # --- BLOQUE 4: CONSULTAS (GET) ---

    def test_08_get_listado_usuarios_admin(self):
        """Caso: Admin lista usuarios con filtros y paginación."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        params = {"page": 1, "limit": 5, "filtroNombre": "Alejandro"}
        res = requests.get(f"{self.BASE_URL_USER}/", headers=headers, params=params)
        
        assert res.status_code == 200
        data = res.json()
        lista = data if isinstance(data, list) else data.get("info", [])
        assert len(lista) > 0
        print(f"✅ Listado de usuarios obtenido ({len(lista)} resultados).")

    def test_09_get_usuario_por_uuid(self):
        """Caso: Admin consulta el detalle de Alejandro por su UUID."""
        uid = TestGestionUsuarios.uuid_user_role_2
        assert uid is not None
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.get(f"{self.BASE_URL_USER}/{uid}", headers=headers)
        
        assert res.status_code == 200
        detalles = res.json().get("info", res.json())
        assert detalles.get("nombre") == "Alejandro"
        print(f"✅ Detalle de usuario por UUID validado.")

    def test_10_get_listado_maquinas_admin(self):
        """Caso: Admin lista todas las máquinas."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.get(f"{self.BASE_URL_MAQUINA}/", headers=headers)
        assert res.status_code == 200
        data = res.json()
        lista = data if isinstance(data, list) else data.get("info", [])
        assert len(lista) > 0
        print(f"✅ Listado de máquinas obtenido.")

    def test_11_get_maquina_por_uuid(self):
        """Caso: Admin consulta detalle de máquina por UUID."""
        mid = TestGestionUsuarios.uuid_maquina_creada
        assert mid is not None
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.get(f"{self.BASE_URL_MAQUINA}/{mid}", headers=headers)
        
        assert res.status_code == 200
        detalles = res.json().get("info", res.json())
        assert detalles.get("nombre") == "Servidor-Procesamiento-01"
        print(f"✅ Detalle de máquina por UUID validado.")
    
    def test_12_patch_modificar_usuario(self):
        """
        Caso: Modificar el nombre del usuario 'Sin Permisos' usando PATCH.
        Endpoint: PATCH /api/user/{uuid}?darBaja=false
        Se espera: 204 No Content.
        """
        # Recuperamos el UUID capturado en tests anteriores
        uid = TestGestionUsuarios.uuid_user_sin_roles
        assert uid is not None, "Error: No se dispone de un UUID de usuario para modificar."
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_USER}/{uid}"
        
        # Parámetros en la query y cuerpo de la petición según especificación
        params = {"darBaja": "false"}
        payload = {
            "nombre": "test usuario modificado",
            "activo": True
        }
        
        # Ejecución de la petición PATCH
        res = requests.patch(url, json=payload, headers=headers, params=params)
        
        # Validación del código de estado (204 indica éxito sin cuerpo de respuesta)
        assert res.status_code == 204
        print(f"\n✅ PATCH enviado correctamente al usuario: {uid}")

        # --- VERIFICACIÓN ADICIONAL ---
        # Comprobamos que el cambio se ha persistido realizando un GET
        res_check = requests.get(url, headers=headers)
        assert res_check.status_code == 200
        
        data_check = res_check.json().get("info", res_check.json())
        nombre_actual = data_check.get("nombre")
        
        assert nombre_actual == "test usuario modificado"
        print(f"✅ Verificación exitosa: El nombre en BD es ahora '{nombre_actual}'")
