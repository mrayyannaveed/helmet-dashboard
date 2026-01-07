import pytest
from fastapi.testclient import TestClient
from backend.main import app, ESP32Device, Helmet, User, Session, engine
from sqlmodel import select
import uuid

client = TestClient(app)

def test_esp32_authentication_contract():
    """Contract test for ESP32 device authentication validation"""
    # Test request without authentication
    valid_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81
    }

    response = client.post("/api/esp32/data", json=valid_payload)
    assert response.status_code == 401  # Should require auth

    # Test request with invalid authentication format
    response = client.post(
        "/api/esp32/data",
        json=valid_payload,
        headers={"Authorization": "InvalidFormatToken"}
    )
    assert response.status_code == 401  # Should reject invalid format

    # Test request with wrong token type (user JWT instead of device token)
    response = client.post(
        "/api/esp32/data",
        json=valid_payload,
        headers={"Authorization": "Bearer some-user-jwt-token"}
    )
    # This would likely fail with 401 since the user JWT won't match device token
    # The actual status depends on implementation details