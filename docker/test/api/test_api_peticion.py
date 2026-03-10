# Esta compilación de test va a cubrir de manera extensiva la creación de peticiones y aprobación. Debido a ello se van a probar las siguientes cosas:
# Creación de dos roles, uno será el de supervisor y otro será el de usuario base.
import requests
import pytest
import time

class TestPeticion: 
    token_admin = None 
    BASE_URL = "http://localhost:8080/api"
    role_supervisor_crear = {
        "nombre": "Supervisor Role",
        "descripcion": "Role encargado de realizar la firma del usuario base.",
        "permisos": [21, 22]
    } 

    role_base_crear = {
        "nombre": "Usuario base",
        "descripcion": "Role con permisos para usuario base.",
        "permisos": [9]
    }
    uuid_rol_creado_supervisor= None
    uuid_rol_creado_base = None
    id_rol_supervisor = None
    id_rol_base = None
    uuid_user_base = None
    uuid_user_supervisor = None
    token_user_base = None
    token_user_supervisor = None
    uuid_peticion_creada = None
    id_supervisor_numerico = None
    # -------------------------------------------------------
    # Creación de los roles:  
    # -------------------------------------------------------
    def test_00_login_admin_exitoso(self):
        """Caso: Login para obtener token de administrador."""
        payload = {
            "correoInstitucional": "alejandro.fisac.contact@gmail.com",
            "contrasena": "afisac"
        }
        res = requests.post(f"{self.BASE_URL}/user/login", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        TestPeticion.token_admin = data["token"]
        print(f"✅ Login admin exitoso. Token obtenido.")

    def test_01_crear_supervisor_exitoso(self):
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.post(f"{self.BASE_URL}/rol", json=self.role_supervisor_crear, headers=headers)
        
        assert res.status_code == 201
        data = res.json()
        TestPeticion.uuid_rol_creado_supervisor = data["uuid"]
        assert data["message"] == "Rol creado con éxito."
        assert "uuid" in data
        assert f"/api/rol/{data['uuid']}" in res.headers.get("Location", "")
        print(f"✅ Rol creado: {data['uuid']}")

    def test_02_crear_base_exitoso(self):
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.post(f"{self.BASE_URL}/rol", json=self.role_base_crear, headers=headers)
        
        assert res.status_code == 201
        data = res.json()
        TestPeticion.uuid_rol_creado_base = data["uuid"]
        assert data["message"] == "Rol creado con éxito."
        assert "uuid" in data
        assert f"/api/rol/{data['uuid']}" in res.headers.get("Location", "")
        print(f"✅ Rol creado: {data['uuid']}")


    def test_03_get_role_by_uuid_exito(self):
        if not self.uuid_rol_creado_supervisor:
            pytest.skip("No hay un UUID de rol creado para probar")

        url = f"{self.BASE_URL}/rol/{self.uuid_rol_creado_supervisor}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        res = requests.get(url, headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        TestPeticion.id_rol_supervisor = data["info"]["idrole"]
        assert data["message"] == "Role encontrado con éxito."
        assert data["info"]["uuidrole"] == self.uuid_rol_creado_supervisor
        # Validamos que incluya la lista de usuarios (aunque esté vacía)
        assert "usuarios" in data["info"]
        assert isinstance(data["info"]["usuarios"], list)

    def test_04_get_role_by_uuid_exito(self):
        if not self.uuid_rol_creado_base:
            pytest.skip("No hay un UUID de rol creado para probar")

        url = f"{self.BASE_URL}/rol/{self.uuid_rol_creado_base}"
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        
        res = requests.get(url, headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        TestPeticion.id_rol_base = data["info"]["idrole"]
        assert data["message"] == "Role encontrado con éxito."
        assert data["info"]["uuidrole"] == self.uuid_rol_creado_base
        # Validamos que incluya la lista de usuarios (aunque esté vacía)
        assert "usuarios" in data["info"]
        assert isinstance(data["info"]["usuarios"], list)
    # -------------------------------------------------------
    # Creación de los usuarios:  
    # -------------------------------------------------------
    def test_05_post_usuario_peticion_base(self):
        """Caso: Crear usuario sin roles y capturar UUID (Multiclave)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombre": "User", "apellido1": "Sin", "apellido2": "Permisos",
            "correoInstitucional": "alejandro.fisac@alumnos.upm.es", 
            "fechaIncorporacion": "2026-02-23",
            "fechaFin": "2027-02-23", "wifi": True, "activo": True,
            "tarjetaAcceso": "T-00000", "teams": False, 
            "esResponsable": True, "roles": [self.id_rol_supervisor], "puertasAutorizadas": [],
            "duenoMaquina": [], "contrasena": "test"
        }
        res = requests.post(f"{self.BASE_URL}/user", json=payload, headers=headers)
        assert res.status_code in [201, 200]
        
        data = res.json()
        # Intentamos capturar de cualquier clave posible
        TestPeticion.uuid_user_supervisor = data.get("uuid") or data.get("id") or (data.get("info", {}) if isinstance(data.get("info"), dict) else {}).get("uuid")
        
        print(f"✅ Usuario supervisor UUID: {TestPeticion.uuid_user_supervisor}")

    def test_05_1_obtener_id_supervisor(self):
        uid = TestPeticion.uuid_user_supervisor # Usando la clase TestPeticion de tus pasos anteriores
        assert uid is not None
        
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        res = requests.get(f"{self.BASE_URL}/user/{uid}", headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        
        # 1. Accedemos a 'info' para sacar el 'idusuario'
        info = data.get("info", {})
        id_numerico = info.get("idusuario")
        
        # 2. Lo guardamos en la clase para usarlo en otros tests si es necesario
        TestPeticion.id_supervisor_numerico = id_numerico
        
        # Validaciones
        assert id_numerico is not None
        assert info.get("nombre") == "User" # Según tu JSON de ejemplo
        
        print(f"✅ ID numérico del supervisor obtenido: {id_numerico}")


    def test_06_post_usuario_peticion_base(self):
        """Caso: Crear usuario sin roles y capturar UUID (Multiclave)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombre": "User", "apellido1": "Sin", "apellido2": "Permisos",
            "correoInstitucional": "pgpprueba609@gmail.com",
            "profesorResponsable": self.id_supervisor_numerico, "fechaIncorporacion": "2026-02-23",
            "fechaFin": "2027-02-23", "wifi": True, "activo": True,
            "tarjetaAcceso": "T-00000", "teams": False, 
            "esResponsable": False, "roles": [self.id_rol_base], "puertasAutorizadas": [],
            "duenoMaquina": [], "contrasena": "test"
        }
        res = requests.post(f"{self.BASE_URL}/user", json=payload, headers=headers)
        assert res.status_code in [201, 200]
        
        data = res.json()
        # Intentamos capturar de cualquier clave posible
        TestPeticion.uuid_user_base = data.get("uuid") or data.get("id") or (data.get("info", {}) if isinstance(data.get("info"), dict) else {}).get("uuid")
        print(f"✅ Usuario sin permisos UUID: {TestPeticion.uuid_user_base}")

    # -------------------------------------------------------
    # Login de los usuarios para tener los respectivos Tokens:  
    # -------------------------------------------------------
    def test_07_login_admin_exitoso(self):
        """Caso: Login para obtener token de supervisor."""
        payload = {
            "correoInstitucional": "alejandro.fisac@alumnos.upm.es",
            "contrasena": "test"
        }
        res = requests.post(f"{self.BASE_URL}/user/login", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        TestPeticion.token_user_supervisor = data["token"]
        print(f"✅ Login admin exitoso. Token obtenido.")   
    
    def test_08_login_admin_exitoso(self):
        """Caso: Login para obtener token de user_base."""
        payload = {
            "correoInstitucional": "pgpprueba609@gmail.com",
            "contrasena": "test"
        }
        res = requests.post(f"{self.BASE_URL}/user/login", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        TestPeticion.token_user_base = data["token"]
        print(f"✅ Login admin exitoso. Token obtenido.")

    # -------------------------------------------------------
    # Test de las peticiones:  
    # -------------------------------------------------------
    def test_09_post_peticion_exito(self):
        """Caso exitoso: Usuario base crea una petición válida."""
        headers = {"Authorization": f"Bearer {self.token_user_base}"}
        payload = {
            "nombreProyectoAsociado": "Proyecto IA",
            "servidorAsociado": [2], 
            "necesidadServidor": "Acceso para pruebas",
            "tareasServidor": "Entrenamiento de modelos",
            "cpuSolicitada": 4,
            "gpuSolicitada": 1,
            "prioridadTarea": 1,
            "docker": True,
            "sistemaOperativo": "Ubuntu 20.04",
            "comentariosAdicionales": "Necesito permisos de sudo",
            "tiempoEstimadoTarea": "1 mes",
            "nombreAccesoNativo": "user-base-ai",
            "disco": 200,
            "ram": 16,
            "momentoEjecucion": 1,
            "nombreServicioAsociado": "AI Platform",
            "justificacionAccesoNativo": "Configuración de entornos",
            "fechaFin": "2026-04-30T23:59:59.999Z"
        }
        
        res = requests.post(f"{self.BASE_URL}/peticion", json=payload, headers=headers)
        
        assert res.status_code == 201
        data = res.json()
        assert "uuidPeticion" in data
        assert "Petición registrada correctamente" in data["message"]
        
        # Guardamos el UUID para futuros tests (como borrar o consultar)
        TestPeticion.uuid_peticion_creada = data["uuidPeticion"]
        print(f"✅ Petición creada con éxito: {data['uuidPeticion']}")

    def test_10_post_peticion_error_usuario_responsable(self):
        """Caso error: Un administrador/responsable no debería poder crear peticiones según las restricciones."""
        # Usamos el token de admin que tiene rol de gestión
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        payload = {
            "nombreProyectoAsociado": "Proyecto Prohibido",
            "servidorAsociado": [1],
            "cpuSolicitada": 2,
            "ram": 4,
            "prioridadTarea": 1,
            "momentoEjecucion": 1
        }
        
        res = requests.post(f"{self.BASE_URL}/peticion", json=payload, headers=headers)
        
        assert res.status_code == 400
        data = res.json()
        assert "error" in data
        print(f"✅ Error validado correctamente: Un responsable no puede crear peticiones.")

    def test_11_post_peticion_error_campos_faltantes(self):
        """Caso error: Petición mal formada (faltan campos obligatorios)."""
        headers = {"Authorization": f"Bearer {self.token_user_base}"}
        # Payload vacío o incompleto
        payload = {
            "nombreProyectoAsociado": "Incompleto"
        }
        
        res = requests.post(f"{self.BASE_URL}/peticion", json=payload, headers=headers)
        
        assert res.status_code == 400
        assert "error" in res.json()
        print(f"✅ Error validado: La API rechazó la petición por falta de campos.")

    def test_12_post_peticion_no_autorizado(self):
        """Caso error: Intentar crear petición sin token."""
        payload = {"nombreProyectoAsociado": "Sin Token"}
        
        res = requests.post(f"{self.BASE_URL}/peticion", json=payload)
        
        assert res.status_code == 401
        print(f"✅ Error validado: No se permite acceso sin Authorization header.")

    # -------------------------------------------------------
    # Test de Visualización y Descarga de Peticiones:  
    # -------------------------------------------------------

    def test_13_get_peticiones_listado_admin(self):
        """Caso: El admin ve todas las peticiones (paginado)."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        params = {
            "page": 1,
            "limit": 10,
            "status": "PENDIENTE"
        }
        res = requests.get(f"{self.BASE_URL}/peticion", headers=headers, params=params)
        
        assert res.status_code == 200
        data = res.json()
        assert "info" in data
        assert isinstance(data["info"]["rows"], list)
        assert "pagination" in data["info"]
        print(f"✅ Listado admin obtenido. Total items: {data['info']['pagination']['totalItems']}")

    def test_14_get_peticion_detalle_exito(self):
        """Caso: Obtener detalle de la petición creada anteriormente por su UUID."""
        if not self.uuid_peticion_creada:
            pytest.skip("No hay UUID de petición para consultar")

        headers = {"Authorization": f"Bearer {self.token_user_base}"}
        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}"
        
        res = requests.get(url, headers=headers)
        
        assert res.status_code == 200
        data = res.json()
        assert data["message"] == "Petición encontrada con éxito."
        assert data["info"]["uuidpeticion"] == self.uuid_peticion_creada
        assert data["info"]["nombreproyectoasociado"] == "Proyecto IA"
        print(f"✅ Detalle de petición validado para UUID: {self.uuid_peticion_creada}")

    def test_15_get_peticion_detalle_404(self):
        """Caso error: Buscar una petición con un UUID inexistente."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        uuid_falso = "00000000-0000-0000-0000-000000000000"
        
        res = requests.get(f"{self.BASE_URL}/peticion/{uuid_falso}", headers=headers)
        
        assert res.status_code == 404
        assert "error" in res.json()
        print("✅ Error 404 validado correctamente para UUID inexistente.")

    def test_16_get_peticion_pdf_exito(self):
        """Caso: Descargar el PDF de la petición con reintentos."""
        if not self.uuid_peticion_creada:
            pytest.skip("No hay UUID de petición para descargar PDF")

        headers = {"Authorization": f"Bearer {self.token_user_base}"}
        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}/file"
        
        max_intentos = 5
        intentos = 0
        res = None

        while intentos < max_intentos:
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                break  # ¡PDF encontrado! Salimos del bucle
            
            print(f"⏳ Intento {intentos + 1}: El PDF no está listo, esperando 2 segundos...")
            time.sleep(2)
            intentos += 1

        # Validamos el resultado final tras los intentos
        assert res.status_code == 200, f"El PDF no se generó tras {max_intentos} intentos"
        assert res.headers["Content-Type"] == "application/pdf"
        assert res.content.startswith(b"%PDF")
        print(f"✅ PDF descargado correctamente ({len(res.content)} bytes).")

    def test_17_get_peticiones_filtro_nombre_error(self):
        """Caso error: Filtrar por un nombre que no existe."""
        headers = {"Authorization": f"Bearer {self.token_admin}"}
        params = {"filtroNombre": "PROYECTO_QUE_NO_EXISTE_12345"}
        
        res = requests.get(f"{self.BASE_URL}/peticion", headers=headers, params=params)
        
        # Según tu documentación, si no hay resultados devuelve 400
        assert res.status_code == 400
        assert "No se han encontrado" in res.json()["message"]
        print("✅ Error 400 validado correctamente cuando no hay resultados de filtro.")

    def test_18_get_peticion_detalle_no_autorizado(self):
        """Caso error: Un usuario base intenta ver una petición que no es suya (si aplica restricción)."""
        # Aquí podrías probar con un segundo usuario base si lo tuvieras, 
        # para verificar que no puede ver el UUID del primero.
        # Por ahora probamos sin token:
        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}"
        res = requests.get(url) # Sin headers
        
        assert res.status_code == 401
        print("✅ Error 401 validado: No se puede ver el detalle sin token.")



    # -------------------------------------------------------
    # Proceso de firma:  
    # -------------------------------------------------------

    def test_19_post_firma_usuario_base_disco_exito(self):
        """Caso: El usuario solicitante sube un PDF REAL desde el disco."""
        if not self.uuid_peticion_creada:
            pytest.skip("No hay UUID de petición para firmar")

        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}/firma"
        headers = {"Authorization": f"Bearer {self.token_user_base}"}

        # Ruta de tu archivo en el disco
        ruta_archivo = "./peticion_firmada.pdf" 

        try:
            # Abrimos el archivo en modo lectura binaria ('rb')
            with open(ruta_archivo, "rb") as pdf_file:
                # 'documentoPdf' es el nombre del campo que espera tu API
                files = {
                    'documentoPdf': (
                        "peticion_firmada.pdf", # Nombre del archivo para el servidor
                        pdf_file,               # El objeto del archivo abierto
                        "application/pdf"       # Tipo MIME
                    )
                }

                # Realizamos la petición
                # NOTA: No pongas 'Content-Type' en headers, requests lo hace por ti al usar 'files'
                res = requests.post(url, headers=headers, files=files)

            # Validaciones de la respuesta
            assert res.status_code == 201
            data = res.json()
            assert data["success"] is True
            print(f"✅ Archivo subido y firmado correctamente: {data.get('message')}")

        except FileNotFoundError:
            pytest.fail(f"❌ No se encontró el archivo PDF en la ruta: {ruta_archivo}")

    def test_20_post_firma_sin_archivo_error(self):
        """Caso error: Intentar firmar sin enviar el archivo PDF."""
        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}/firma"
        headers = {"Authorization": f"Bearer {self.token_user_base}"}
        
        # Enviamos una petición POST vacía (sin files)
        res = requests.post(url, headers=headers)
        
        assert res.status_code == 400
        assert "error" in res.json()
        print("✅ Error 400 validado: No se puede firmar sin adjuntar el documento.")

    def test_21_post_firma_revisor(self):
        if not self.uuid_peticion_creada:
            pytest.skip("No hay UUID de petición para firmar")

        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}/firma"
        headers = {"Authorization": f"Bearer {self.token_user_supervisor}"}

        # Ruta de tu archivo en el disco
        ruta_archivo = "./peticion_firmada.pdf" 

        try:
            # Abrimos el archivo en modo lectura binaria ('rb')
            with open(ruta_archivo, "rb") as pdf_file:
                # 'documentoPdf' es el nombre del campo que espera tu API
                files = {
                    'documentoPdf': (
                        "peticion_firmada.pdf", # Nombre del archivo para el servidor
                        pdf_file,               # El objeto del archivo abierto
                        "application/pdf"       # Tipo MIME
                    )
                }

                # Realizamos la petición
                # NOTA: No pongas 'Content-Type' en headers, requests lo hace por ti al usar 'files'
                res = requests.post(url, headers=headers, files=files)

            # Validaciones de la respuesta
            assert res.status_code == 201
            data = res.json()
            assert data["success"] is True
            print(f"✅ Archivo subido y firmado correctamente: {data.get('message')}")

        except FileNotFoundError:
            pytest.fail(f"❌ No se encontró el archivo PDF en la ruta: {ruta_archivo}")

    def test_22_post_jefe(self):
        if not self.uuid_peticion_creada:
            pytest.skip("No hay UUID de petición para firmar")

        url = f"{self.BASE_URL}/peticion/{self.uuid_peticion_creada}/firma"
        headers = {"Authorization": f"Bearer {self.token_admin}"}

        # Ruta de tu archivo en el disco
        ruta_archivo = "./peticion_firmada.pdf" 

        try:
            # Abrimos el archivo en modo lectura binaria ('rb')
            with open(ruta_archivo, "rb") as pdf_file:
                # 'documentoPdf' es el nombre del campo que espera tu API
                files = {
                    'documentoPdf': (
                        "peticion_firmada.pdf", # Nombre del archivo para el servidor
                        pdf_file,               # El objeto del archivo abierto
                        "application/pdf"       # Tipo MIME
                    )
                }

                # Realizamos la petición
                # NOTA: No pongas 'Content-Type' en headers, requests lo hace por ti al usar 'files'
                res = requests.post(url, headers=headers, files=files)

            # Validaciones de la respuesta
            assert res.status_code == 201
            data = res.json()
            assert data["success"] is True
            print(f"✅ Archivo subido y firmado correctamente: {data.get('message')}")

        except FileNotFoundError:
            pytest.fail(f"❌ No se encontró el archivo PDF en la ruta: {ruta_archivo}")




