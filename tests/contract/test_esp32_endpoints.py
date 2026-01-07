import pytest
from fastapi.testclient import TestClient
from backend.main import app
import json

client = TestClient(app)

def test_esp32_data_endpoint_contract():
    """Contract test for POST /api/esp32/data endpoint"""
    # Test valid request
    valid_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81,
        "battery_level": 85,
        "signal_strength": -55
    }

    # This should fail with 401 because no auth token is provided
    response = client.post("/api/esp32/data", json=valid_payload)
    assert response.status_code == 401  # Unauthorized without token

    # Test invalid request - missing required fields for 3D sensor
    invalid_payload = {
        "sensor_type": "ACCELEROMETER",
        # Missing x_value, y_value, z_value
    }

    response = client.post("/api/esp32/data", json=invalid_payload)
    assert response.status_code == 401  # Still unauthorized, but would be 422 for validation if authorized


def test_esp32_data_endpoint_valid_auth():
    """Test with valid device token format (but device may not exist)"""
    valid_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81,
        "battery_level": 85,
        "signal_strength": -55
    }

    # Use a mock device token
    response = client.post(
        "/api/esp32/data",
        json=valid_payload,
        headers={"Authorization": "Bearer mock-device-token"}
    )
    # Should return 401 because the mock token doesn't exist in DB
    assert response.status_code == 401