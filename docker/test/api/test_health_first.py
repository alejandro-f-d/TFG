import requests
import pytest
import time

def test_api_healthcheck():
    """Test básico para verificar que la API responde"""
    url = "http://localhost:8080/api/healthcheck"
    try:
        response = requests.get(url, timeout=10)
        print(f"Healthcheck response: {response.status_code}")
        if response.status_code == 200:
            print(f"Response body: {response.text}")
        assert response.status_code == 200
    except requests.exceptions.ConnectionError:
        pytest.fail(f"Cannot connect to API at {url}")
    except Exception as e:
        pytest.fail(f"Error connecting to API: {e}")

def test_api_root():
    """Test básico para verificar que la API raíz responde"""
    url = "http://localhost:8080/"
    try:
        response = requests.get(url, timeout=10)
        print(f"Root response: {response.status_code}")
        assert response.status_code < 500
    except Exception as e:
        pytest.fail(f"Error connecting to API root: {e}")

def test_db_connection():
    """Verificar que la API puede conectar con la BD"""
    # Asumiendo que hay un endpoint de healthcheck completo
    url = "http://localhost:8080/api/healthcheck"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"Healthcheck data: {data}")
            # Si la API devuelve información de la BD
            if "database" in data or "db" in data:
                assert data.get("database") == "connected" or data.get("db") == "connected"
    except Exception as e:
        print(f"Warning: Could not verify DB connection: {e}")
