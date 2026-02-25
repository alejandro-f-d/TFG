import requests
import pytest

class TestGestionUsuarios:
    # Configuración de URLs
    BASE_URL_USER = "http://localhost:8080/api/user"
    LOGIN_URL = "http://localhost:8080/api/user/login"
    BASE_URL_MAQUINA = "http://localhost:8080/api/maquina"
    BASE_URL = "http://localhost:8080/api"
    BASE_URL_ROL = "http://localhost:8080/api/rol"

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
    def test_13_patch_modificar_maquina(self):
        """
        Caso: Actualizar parcialmente el nombre de una máquina.
        Endpoint: PATCH /api/maquina/{uuid}
        Se espera: 204 No Content.
        """
        # Recuperamos el UUID de la máquina creada anteriormente
        mid = TestGestionUsuarios.uuid_maquina_creada
        assert mid is not None, "Error: No se dispone de un UUID de máquina para modificar."
        
        # Usamos el token de admin (o el del dueño con permisos)
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}"
        
        payload = {
            "nombre": "Athenea Modificado"
        }
        
        # Ejecución de la petición PATCH
        res = requests.patch(url, json=payload, headers=headers)
        
        # Validación: El código 204 indica éxito (sin contenido)
        assert res.status_code == 204
        print(f"\n✅ PATCH enviado correctamente a la máquina: {mid}")

        # --- VERIFICACIÓN ---
        # Realizamos un GET para confirmar que el nombre ha cambiado en la base de datos
        res_check = requests.get(url, headers=headers)
        assert res_check.status_code == 200
        
        data_check = res_check.json().get("info", res_check.json())
        nuevo_nombre = data_check.get("nombre")
        
        assert nuevo_nombre == "Athenea Modificado"
        print(f"✅ Verificación exitosa: El nombre de la máquina es ahora '{nuevo_nombre}'")
    uuid_servicio_creado = None
    def test_14_post_crear_servicio_en_maquina(self):
        """
        Caso: Crear un nuevo servicio asociado al UUID de la máquina creada.
        Endpoint: POST /api/maquina/{uuid}/servicios
        Se espera: 201 Created.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        assert mid is not None, "Error: No hay UUID de máquina para asociar el servicio."
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios"
        
        payload = {
            "nombreServicio": "Servidor Web de Pruebas",
            "descripcionTecnica": "Instancia de Apache para el despliegue del microservicio de auditoría.",
            "entorno": "Desarrollo",
            "publico": True,
            "softwareBase": "Apache/2.4.41 (Ubuntu)",
            "activo": True,
            "nivelSeveridad": "bajo",
            "idUsuario": 1,
            "idPeticion": 1,
            "servidores": [1, 2],
            "puertosAbiertos": [
                {
                    "numeroPuertoMaquina": 80,
                    "protocolo": "TCP",
                    "nombreServicio": "HTTP",
                    "puertoVirtual": 8080
                }
            ]
        }
        
        res = requests.post(url, json=payload, headers=headers)
        data = res.json()
        # TestGestionUsuarios.uuid_servicio_creado = data["info"]["uuidServicio"]
        
        # Validación: El código 201 indica creación exitosa
        if res.status_code != 201:
            print(f"\n❌ Error {res.status_code} al crear servicio: {res.text}")
            
        assert res.status_code == 201
        print(f"\n✅ Servicio '{payload['nombreServicio']}' creado con éxito para la máquina {mid}")
    def test_15_get_servicios_de_maquina(self):
        """
        Caso: Obtener los servicios asociados a una máquina.
        Soporta respuestas donde 'info' es un objeto único o una lista.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        assert mid is not None
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios"
        
        params = {"page": 1, "limit": 10, "filtroNombre": "Servidor Web"}
        res = requests.get(url, headers=headers, params=params)
        
        assert res.status_code == 200
        data = res.json()
        
        # Extraemos 'info'
        info_data = data.get("info", [])
        
        # Normalizamos: si es un dict, lo metemos en una lista; si es lista, se queda igual
        servicios = [info_data] if isinstance(info_data, dict) else info_data
        
        assert isinstance(servicios, list), f"No se pudo procesar 'info' como lista. Tipo: {type(info_data)}"
        assert len(servicios) > 0, "No se encontraron servicios en la máquina"
        
        # Verificamos el nombre (atención a posibles minúsculas en las llaves del JSON)
        # Usamos .lower() para ser más flexibles con el nombre
        nombres = [str(s.get("nombreServicio", s.get("nombreservicio", ""))) for s in servicios]
        
        assert any("Servidor Web" in n for n in nombres), f"No se encontró el servicio. Nombres en BD: {nombres}"
        
        print(f"✅ Servicios validados correctamente (formato {type(info_data).__name__}): {nombres}")
        # Guardamos el uuid del servicio encontrado
        primer_servicio = servicios[0]
        uuid_servicio = primer_servicio.get("uuidServicio") or primer_servicio.get("uuidservicio")

        assert uuid_servicio is not None, f"No se encontró uuidServicio en: {primer_servicio}"

        TestGestionUsuarios.uuid_servicio_creado = uuid_servicio
    def test_16_get_servicio_por_uuid(self):
        """
        Caso: Obtener un servicio específico por su UUID asociado a una máquina.
        Endpoint: GET /api/maquina/{uuid}/servicios/{uuidServicio}
        Se espera: 200 OK.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        uuid_servicio = TestGestionUsuarios.uuid_servicio_creado
        
        assert mid is not None, "Error: No hay UUID de máquina disponible."
        assert uuid_servicio is not None, "Error: No hay UUID de servicio disponible."
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{uuid_servicio}"
        
        res = requests.get(url, headers=headers)
        
        if res.status_code != 200:
            print(f"\n❌ Error {res.status_code} al obtener servicio por UUID: {res.text}")
        
        assert res.status_code == 200
        
        data = res.json()
        assert "info" in data, "La respuesta no contiene el campo 'info'"
        
        servicio = data["info"]
        assert isinstance(servicio, dict), f"Se esperaba un objeto dict, se obtuvo {type(servicio)}"
        
        # Validamos algunos campos clave
        nombre_servicio = servicio.get("nombreServicio", servicio.get("nombreservicio", ""))
        assert nombre_servicio == "Servidor Web de Pruebas", \
            f"El nombre del servicio no coincide. Recibido: {nombre_servicio}"
        
        print(f"✅ Servicio obtenido correctamente por UUID: {uuid_servicio}")

    def test_17_patch_servicio_exito(self):
        """
        Caso: Actualización exitosa (204) y verificación de persistencia (200).
        """
        # 1. Preparación de datos
        mid = TestGestionUsuarios.uuid_maquina_creada
        sid = TestGestionUsuarios.uuid_servicio_creado
        
        assert mid is not None and sid is not None, "Error: UUIDs de máquina o servicio no encontrados"

        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{sid}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # Valores que queremos actualizar
        nuevo_nombre = "Apache Web Server v2.4 Updated"
        nueva_desc = "Servidor optimizado para produccion"
        
        payload = {
            "nombreServicio": nuevo_nombre,
            "descripcionTecnica": nueva_desc,
            "entorno": "produccion",
            "publico": True,
            "softwareBase": "Apache 2.4",
            "activo": True,
            "nivelSeveridad": "alto",
            "servidores": [1, 2, 3], # Asegúrate de que estos IDs de servidor existen en tu DB de pruebas
            "puertosAbiertos": [
                {
                    "numeroPuertoMaquina": 80,
                    "protocolo": "TCP",
                    "nombreServicio": "http",
                    "puertoVirtual": 8080
                }
            ]
        }

        # 2. Ejecutar el PATCH
        print(f"\nEnviando PATCH a: {url}")
        res_patch = requests.patch(url, json=payload, headers=headers)
        
        # Validamos que el controlador responda 204 (No Content)
        assert res_patch.status_code == 204
        print(f"✅ PATCH exitoso (Status 204)")

        # 3. Verificar la actualización con un GET
        res_get = requests.get(url, headers=headers)
        assert res_get.status_code == 200
        
        datos_api = res_get.json()
        
        # Extraemos el objeto 'info' según la estructura de tu API
        info = datos_api.get("info", {})
        
        # Debug por si algo falla (ver con pytest -s)
        print(f"DEBUG: Datos en 'info': {info}")

        # 4. Validaciones de integridad (claves en minúscula por Postgres)
        nombre_db = info.get("nombreservicio")
        desc_db = info.get("descripciontecnica")
        entorno_db = info.get("entorno")
        puertos = info.get("lista_puertos", [])

        assert nombre_db == nuevo_nombre, f"Fallo: se esperaba '{nuevo_nombre}', pero la DB tiene '{nombre_db}'"
        assert desc_db == nueva_desc
        assert entorno_db == "produccion"
        
        # Verificamos que al menos el puerto que enviamos esté presente
        assert len(puertos) > 0, "La lista de puertos está vacía"
        assert puertos[0]["puerto"] == 80
        assert puertos[0]["protocolo"] == "TCP"

        print(f"✅ VERIFICACIÓN OK: Los datos se han persistido correctamente en la DB.")
    def test_18_patch_servicio_vacio_error(self):
        """
        Caso: Enviar un cuerpo vacío o sin campos de actualización.
        Respuesta esperada: 400 Bad Request.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        sid = TestGestionUsuarios.uuid_servicio_creado
        
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{sid}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # Payload vacío para forzar el error 400
        res = requests.patch(url, json={}, headers=headers)
        
        assert res.status_code == 400
        data = res.json()
        assert "error" in data
        print(f"✅ Error 400 validado: {data['error']}")

    def test_19_patch_servicio_no_encontrado(self):
        """
        Caso: Intentar actualizar un servicio con un UUID inexistente.
        Respuesta esperada: 404 Not Found.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        uuid_falso = "00000000-0000-0000-0000-000000000000"
        
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{uuid_falso}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        payload = {"nombreServicio": "Inexistente"}
        res = requests.patch(url, json=payload, headers=headers)
        
        assert res.status_code == 404
        print("✅ Error 404 validado para servicio inexistente.")

    def test_20_patch_servicio_sin_token(self):
        """
        Caso: Intentar actualizar sin proporcionar el token.
        Respuesta esperada: 401 Unauthorized.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        sid = TestGestionUsuarios.uuid_servicio_creado
        
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{sid}"
        
        res = requests.patch(url, json={"nombreServicio": "Sin Token"})
        
        assert res.status_code == 401
        print("✅ Error 401 validado: No autorizado.")
    def test_21_delete_servicio_por_uuid(self):
        """
        Caso: Eliminar un servicio específico asociado a una máquina.
        Endpoint: DELETE /api/maquina/{uuid}/servicios/{uuidServicio}
        Se espera: 200 OK o 204 No Content.
        """
        mid = TestGestionUsuarios.uuid_maquina_creada
        uuid_servicio = TestGestionUsuarios.uuid_servicio_creado

        assert mid is not None, "Error: No hay UUID de máquina disponible."
        assert uuid_servicio is not None, "Error: No hay UUID de servicio disponible."

        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}/servicios/{uuid_servicio}"

        res = requests.delete(url, headers=headers)

        if res.status_code not in (200, 204):
            print(f"\n❌ Error {res.status_code} al eliminar servicio: {res.text}")

        assert res.status_code in (200, 204)

        print(f"\n✅ DELETE enviado correctamente para el servicio: {uuid_servicio}")

        # 🔎 Verificación: Intentar obtener el servicio eliminado debe devolver 404
        res_check = requests.get(url, headers=headers)

        assert res_check.status_code == 404, \
            f"El servicio aún existe después del DELETE. Status: {res_check.status_code}"

        print("✅ Verificación exitosa: El servicio ya no existe (404).")
    def test_22_delete_maquina(self):
        """
        Caso: Eliminar una máquina por su UUID.
        Endpoint: DELETE /api/maquina/{uuid}
        Se espera: 204 No Content.
        """
        # Recuperamos el UUID de la máquina que modificamos antes
        mid = TestGestionUsuarios.uuid_maquina_creada
        assert mid is not None, "Error: No hay UUID de máquina para eliminar."
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        url = f"{self.BASE_URL_MAQUINA}/{mid}"
        
        # Ejecución de la petición DELETE
        res = requests.delete(url, headers=headers)
        
        # Validación: Código 204 indica eliminación exitosa
        assert res.status_code == 204
        print(f"\n✅ DELETE enviado correctamente para la máquina: {mid}")

        # --- VERIFICACIÓN ---
        # Al intentar obtenerla de nuevo, debería devolver 404
        res_check = requests.get(url, headers=headers)
        assert res_check.status_code == 404
        print(f"✅ Verificación exitosa: La máquina ya no existe (404).")

    def test_23_post_proyecto_gitlab_exito(self):
        """
        Caso: Creación exitosa de un proyecto de GitLab con participantes.
        Respuesta esperada: 201 Created (o 200 OK).
        """
        url = f"{self.BASE_URL}/proyectosgitlab"
        headers = {
            "Authorization": f"Bearer {self.token_admin}",
            "Content-Type": "application/json"
        }
        
        # Datos según tu ejemplo de Swagger
        payload = {
            "nombre": "Proyecto Alpha",
            "descripcion": "Proyecto principal de desarrollo backend para la migración de microservicios",
            "fechaInicio": "2024-01-15",
            "fechaFin": "2024-12-31",
            "activo": True,
            "participantes": [1, 2] # IDs de usuarios obtenidos previamente
        }

        print(f"\nCreando proyecto GitLab: {payload['nombre']}")
        res = requests.post(url, json=payload, headers=headers)

        # Verificamos el status code
        # Nota: Si tu API devuelve 200 en lugar de 201, cambia esto.
        assert res.status_code in [200, 201], f"Error al crear: {res.text}"
        
        data = res.json()
        
        # Validamos que la respuesta contenga un mensaje de éxito o el objeto creado
        assert "error" not in data
        print(f"✅ Proyecto creado con éxito. Respuesta: {data.get('message', 'OK')}")

    def test_24_post_proyecto_gitlab_sin_token(self):
        """
        Caso: Intentar crear un proyecto sin cabecera de autorización.
        Respuesta esperada: 401 Unauthorized.
        """
        url = f"{self.BASE_URL}/proyectosgitlab"
        payload = {
            "nombre": "Proyecto Fallido",
            "participantes": []
        }
        
        res = requests.post(url, json=payload)
        
        assert res.status_code == 401
        print("✅ Error 401 validado correctamente al no enviar token.")

    def test_25_post_proyecto_gitlab_datos_invalidos(self):
        """
        Caso: Intentar crear un proyecto sin el campo obligatorio 'nombre'.
        Respuesta esperada: 400 Bad Request.
        """
        url = f"{self.BASE_URL}/proyectosgitlab"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # Enviamos payload sin 'nombre'
        payload = {
            "descripcion": "Sin nombre no debería crearse",
            "activo": True
        }
        
        res = requests.post(url, json=payload, headers=headers)
        
        assert res.status_code == 400
        print(f"✅ Error 400 validado correctamente ante datos insuficientes.")

    def test_26_get_proyectos_gitlab_paginado(self):
        """
        Caso: Obtener lista de proyectos y validar estructura de respuesta y paginación.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        params = {
            "page": 1,
            "limit": 5
        }

        res = requests.get(url, headers=headers, params=params)
        
        assert res.status_code == 200
        data = res.json()
        
        # 1. Validar estructura de primer nivel
        assert data["message"] == "Lista de proyectos de gitlab devuelta correctamente."
        assert "info" in data
        
        # 2. Validar estructura de 'info'
        info = data["info"]
        assert info["status"] == "OK"
        assert isinstance(info["rows"], list)
        
        # 3. Validar objeto de paginación (está en dos sitios según tu JSON)
        pagination = data.get("pagination")
        assert pagination is not None
        assert "totalItems" in pagination
        assert pagination["currentPage"] == 1
        
        print(f"✅ Lista recibida. Total items: {pagination['totalItems']}")

    def test_27_get_proyectos_gitlab_filtro_nombre(self):
        """
        Caso: Filtrar por nombre y validar que los resultados coincidan.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        nombre_a_buscar = "IA-Research"
        params = {"filtroNombre": nombre_a_buscar}

        res = requests.get(url, headers=headers, params=params)
        assert res.status_code == 200
        
        data = res.json()
        proyectos = data["info"]["rows"] # Acceso a la lista real

        # Verificamos que los resultados contengan el filtro
        for p in proyectos:
            # PostgreSQL suele devolver las claves en minúsculas
            nombre_proyecto = p.get("nombre", "")
            assert nombre_a_buscar.lower() in nombre_proyecto.lower()
            
        print(f"✅ Filtro verificado. Se encontraron {len(proyectos)} coincidencias.")

    def test_28_get_proyectos_gitlab_vacio(self):
        """
        Caso: Filtro que no coincide con nada.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        params = {"filtroNombre": "NOMBRE_QUE_NO_EXISTE_123456"}
        res = requests.get(url, headers=headers, params=params)
        
        assert res.status_code == 200
        data = res.json()
        # La API debería devolver una lista vacía en 'rows', no un error
        assert len(data["info"]["rows"]) == 0
        print("✅ Correcto: Lista vacía para filtro inexistente.")

    def test_29_verificar_formato_uuid(self):
        """
        Caso: Verificar que los proyectos traen un UUID válido.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        res = requests.get(url, headers=headers)
        proyectos = res.json()["info"]["rows"]
        
        if len(proyectos) > 0:
            uuid_proyecto = proyectos[0].get("uuidproyecto")
            # Validamos formato básico de UUID (8-4-4-4-12 hex)
            import re
            regex = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
            assert re.match(regex, uuid_proyecto.lower())
            print(f"✅ Formato UUID verificado: {uuid_proyecto}")

    def test_30_get_proyecto_uuid_exito(self):
        """
        Caso: Obtener el detalle de un proyecto existente.
        Pasos: 1. Obtener lista, 2. Tomar un UUID real, 3. Pedir detalle.
        """
        base = self.BASE_URL.rstrip('/')
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # 1. Obtenemos un UUID real de la base de datos para que el test no falle
        res_lista = requests.get(f"{base}/proyectosgitlab", headers=headers)
        proyectos = res_lista.json()["info"]["rows"]
        
        assert len(proyectos) > 0, "No hay proyectos en la DB para probar el detalle"
        uuid_real = proyectos[0]["uuidproyecto"]
        nombre_esperado = proyectos[0]["nombre"]

        # 2. Pedimos el detalle por UUID
        url = f"{base}/proyectosgitlab/{uuid_real}"
        res = requests.get(url, headers=headers)

        assert res.status_code == 200
        data = res.json()
        
        # 3. Validaciones de integridad
        assert data["message"] == "Proyecto de GitLab encontrado correctamente."
        info = data["info"]
        assert info["uuidproyecto"] == uuid_real
        assert info["nombre"] == nombre_esperado
        
        # Validar que los participantes vengan como lista (gracias al json_agg del model)
        assert isinstance(info["participantes"], list)
        
        print(f"✅ Detalle verificado para: {nombre_esperado} ({len(info['participantes'])} participantes)")

    def test_31_get_proyecto_uuid_formato_invalido(self):
        """
        Caso: Enviar un UUID con formato incorrecto (no sigue el patrón hex).
        Respuesta esperada: 400 Bad Request.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab/esto-no-es-un-uuid"
        headers = {"Authorization": f"Bearer {self.token_admin}"}

        res = requests.get(url, headers=headers)

        assert res.status_code == 400
        assert "error" in res.json()
        assert "formato" in res.json()["error"].lower()
        print("✅ Error 400 detectado ante UUID mal formado.")

    def test_32_get_proyecto_uuid_no_existente(self):
        """
        Caso: UUID con formato válido pero que no existe en la base de datos.
        Respuesta esperada: 404 Not Found.
        """
        base = self.BASE_URL.rstrip('/')
        uuid_inventado = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        url = f"{base}/proyectosgitlab/{uuid_inventado}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}

        res = requests.get(url, headers=headers)

        assert res.status_code == 404
        # Validamos el mensaje que pusimos en el controlador corregido
        assert f"No se ha encontrado ningún proyecto con el UUID: {uuid_inventado}" in res.json()["message"]
        print("✅ Error 404 detectado correctamente para UUID inexistente.")

    def test_33_get_proyecto_uuid_sin_token(self):
        """
        Caso: Acceder al detalle sin estar autenticado.
        Respuesta esperada: 401 Unauthorized.
        """
        base = self.BASE_URL.rstrip('/')
        # Usamos un UUID cualquiera
        url = f"{base}/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"

        res = requests.get(url) # Sin headers

        assert res.status_code == 401
        print("✅ Error 401 validado al no enviar token.")

    def test_34_get_proyecto_uuid_verificar_participantes(self):
        """
        Caso: Verificar que los campos de los participantes son correctos (nombre y apellidos).
        """
        base = self.BASE_URL.rstrip('/')
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # Obtenemos el primer proyecto
        res_lista = requests.get(f"{base}/proyectosgitlab", headers=headers)
        uuid_real = res_lista.json()["info"]["rows"][0]["uuidproyecto"]

        res = requests.get(f"{base}/proyectosgitlab/{uuid_real}", headers=headers)
        participantes = res.json()["info"]["participantes"]

        if len(participantes) > 0:
            p = participantes[0]
            # Según nuestra query: idUsuario, nombre, apellidos
            assert "idUsuario" in p
            assert "nombre" in p
            assert "apellidos" in p
            print(f"✅ Estructura de participante válida: {p['nombre']} {p['apellidos']}")
        else:
            pytest.skip("El proyecto no tiene participantes para validar esta parte")

    def test_35_patch_proyecto_datos_exito(self):
        """
        Caso: Actualizar nombre y descripción del proyecto.
        Respuesta esperada: 204 No Content + Verificación con GET.
        """
        base = self.BASE_URL.rstrip('/')
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # 1. Obtenemos un UUID real para actualizar
        res_lista = requests.get(f"{base}/proyectosgitlab", headers=headers)
        proyectos = res_lista.json()["info"]["rows"]
        assert len(proyectos) > 0, "No hay proyectos para actualizar"
        
        uuid_target = proyectos[0]["uuidproyecto"]
        nuevo_nombre = "Proyecto Actualizado via Test"
        nueva_desc = "Nueva descripción técnica corregida"

        # 2. Realizamos el PATCH (solo campos de texto)
        url = f"{base}/proyectosgitlab/{uuid_target}"
        payload = {
            "nombre": nuevo_nombre,
            "descripcion": nueva_desc
        }
        
        res_patch = requests.patch(url, json=payload, headers=headers)
        assert res_patch.status_code == 204
        print(f"✅ PATCH: Datos de texto actualizados (204).")

        # 3. Verificamos que los cambios persistan
        res_get = requests.get(url, headers=headers)
        info = res_get.json()["info"]
        assert info["nombre"] == nuevo_nombre
        assert info["descripcion"] == nueva_desc
        print("✅ VERIFICACIÓN: El GET confirma los nuevos datos.")

    def test_36_patch_proyecto_participantes_exito(self):
        """
        Caso: Cambiar la lista de participantes (limpiar y asignar nuevos).
        """
        base = self.BASE_URL.rstrip('/')
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        # Tomamos el mismo proyecto
        res_lista = requests.get(f"{base}/proyectosgitlab", headers=headers)
        uuid_target = res_lista.json()["info"]["rows"][0]["uuidproyecto"]
        
        # Supongamos que queremos asignar solo al usuario ID 1
        url = f"{base}/proyectosgitlab/{uuid_target}"
        payload = {
            "participantes": [1] 
        }

        res_patch = requests.patch(url, json=payload, headers=headers)
        assert res_patch.status_code == 204

        # Verificamos
        res_get = requests.get(url, headers=headers)
        participantes = res_get.json()["info"]["participantes"]
        
        # Comprobamos que ahora solo hay 1 participante y su ID es el correcto
        assert len(participantes) == 1
        assert participantes[0]["idUsuario"] == 1
        print("✅ VERIFICACIÓN: Participantes actualizados correctamente.")

    def test_37_patch_proyecto_vacio(self):
        """
        Caso: Enviar un cuerpo vacío al PATCH.
        Respuesta esperada: 400 Bad Request.
        """
        base = self.BASE_URL.rstrip('/')
        # Usamos un UUID válido pero el body es {}
        url = f"{base}/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"
        headers = {"Authorization": f"Bearer {self.token_admin}"}

        res = requests.patch(url, json={}, headers=headers)
        
        assert res.status_code == 400
        print("✅ Error 400 detectado ante cuerpo de petición vacío.")

    def test_38_patch_proyecto_no_encontrado(self):
        """
        Caso: Intentar actualizar un proyecto que no existe.
        Respuesta esperada: 404 Not Found.
        """
        base = self.BASE_URL.rstrip('/')
        uuid_falso = "99999999-9999-9999-9999-999999999999"
        url = f"{base}/proyectosgitlab/{uuid_falso}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}

        payload = {"nombre": "Inexistente"}
        res = requests.patch(url, json=payload, headers=headers)
        
        assert res.status_code == 404
        print("✅ Error 404 detectado para proyecto inexistente.")

    def test_39_patch_proyecto_sin_permisos(self):
        """
        Caso: Intentar actualizar sin token.
        Respuesta esperada: 401 Unauthorized.
        """
        base = self.BASE_URL.rstrip('/')
        url = f"{base}/proyectosgitlab/123e4567-e89b-12d3-a456-426614174000"
        
        res = requests.patch(url, json={"nombre": "Hack"})
        assert res.status_code == 401
        print("✅ Seguridad: Denegado PATCH sin token.")

    role_valido = {
        "nombre": "Administrador de Proyectos",
        "descripcion": "Rol con permisos para gestionar proyectos y usuarios",
        "permisos": [1, 2, 3, 5]
    }


    def test_40_crear_rol_exitoso(self):
        """Caso: Crear un rol con campos válidos. Se espera 201."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.post(self.BASE_URL_ROL, json=self.role_valido, headers=headers)
        
        assert res.status_code == 201
        data = res.json()
        assert data["message"] == "Rol creado con éxito."
        assert "uuid" in data
        assert f"/api/rol/{data['uuid']}" in res.headers.get("Location", "")
        print(f"✅ Rol creado: {data['uuid']}")

    def test_41_crear_rol_sin_nombre_error(self):
        """Caso: Error 400 por falta de nombre."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {"permisos": [1, 2], "descripcion": "Sin nombre"}
        res = requests.post(self.BASE_URL_ROL, json=payload, headers=headers)
        
        assert res.status_code == 400
        assert "error" in res.json()

    def test_42_crear_rol_permisos_vacio_error(self):
        """Caso: Error 400 por lista de permisos vacía."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {"nombre": "Test Vacio", "permisos": []}
        res = requests.post(self.BASE_URL_ROL, json=payload, headers=headers)
        assert res.status_code == 400

    def test_43_crear_rol_sin_token_error(self):
        """Caso: Error 401 por falta de token."""
        res = requests.post(self.BASE_URL_ROL, json=self.role_valido)
        assert res.status_code == 401

    def test_44_crear_rol_insuficiente_permiso(self):
        """Caso: Error 403 (Usuario sin permiso 'roles:postRoles')."""
        # Primero necesitamos el token del usuario sin roles creado en test_03/05
        if not self.token_sin_roles:
            pytest.skip("Token de usuario normal no disponible")
            
        headers = {"Authorization": f"Bearer {self.token_sin_roles}"}
        res = requests.post(self.BASE_URL_ROL, json=self.role_valido, headers=headers)
        assert res.status_code == 403

    def test_45_asignar_admin_total_siendo_admin(self):
        """Caso: Un admin asigna el ID de permiso 'admin:total' (asumiendo ID 1)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombre": "Rol Super Usuario",
            "permisos": [1] # ID correspondiente a admin:total
        }
        res = requests.post(self.BASE_URL_ROL, json=payload, headers=headers)
        assert res.status_code == 201
