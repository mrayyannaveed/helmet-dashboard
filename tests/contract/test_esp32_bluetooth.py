import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_bluetooth_connection_endpoint_contract():
    """Contract test for Bluetooth connection endpoint"""
    # The API doesn't differentiate between WiFi and Bluetooth at the HTTP level
    # Both use the same endpoints but may have different connection characteristics
    # Testing the same endpoints to ensure they work for any connection method

    # Test that the main ESP32 data endpoint is available
    # This would be called by both WiFi and Bluetooth connections
    valid_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81
    }

    # Should return 401 without proper authentication (expected)
    response = client.post("/api/esp32/data", json=valid_payload)
    assert response.status_code == 401

    # Test status endpoint
    response = client.get("/api/esp32/status")
    assert response.status_code == 401  # Should require auth

    # Test device registration endpoint
    register_payload = {
        "device_id": "test-bluetooth-device",
        "helmet_id": "12345678-1234-5678-1234-123456789012"
    }

    response = client.post("/api/devices/register", json=register_payload)
    assert response.status_code == 401  # Should require user auth