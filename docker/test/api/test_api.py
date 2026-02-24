import requests
import pytest

class TestGestionUsuarios:
    # Configuración de URLs
    BASE_URL_USER = "http://localhost:8080/api/user"
    LOGIN_URL = "http://localhost:8080/api/user/login"
    BASE_URL_MAQUINA = "http://localhost:8080/api/maquina"
    BASE_URL = "http://localhost:8080/api"
    
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
    def test_16_post_crear_servicio_en_maquina(self):
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
    def test_17_get_servicios_de_maquina(self):
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
    def test_18_get_servicio_por_uuid(self):
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

    def test_20_patch_servicio_exito(self):
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
    def test_21_patch_servicio_vacio_error(self):
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

    def test_22_patch_servicio_no_encontrado(self):
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

    def test_23_patch_servicio_sin_token(self):
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
    def test_19_delete_servicio_por_uuid(self):
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
    def test_15_delete_maquina(self):
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

    def test_30_post_proyecto_gitlab_exito(self):
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

    def test_31_post_proyecto_gitlab_sin_token(self):
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

    def test_32_post_proyecto_gitlab_datos_invalidos(self):
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
