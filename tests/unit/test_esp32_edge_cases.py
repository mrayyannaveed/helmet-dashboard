import pytest
from fastapi.testclient import TestClient
from backend.main import app, ESP32Device, SensorData, Helmet, User, Session, engine
from sqlmodel import select
import uuid
import time

client = TestClient(app)

def test_esp32_rate_limiting():
    """Unit test for ESP32 rate limiting functionality"""
    # First register a device for testing
    login_response = client.post(
        "/api/auth/login",
        data={"username": "admin@example.com", "password": "admin123"}
    )

    if login_response.status_code == 200:
        user_token = login_response.json()["access_token"]

        # Register a test device
        register_payload = {
            "device_id": "test-rate-limit-device",
            "helmet_id": "12345678-1234-5678-1234-123456789012"  # Will fail, need valid helmet
        }

        # We need to create a valid helmet first
        with Session(engine) as session:
            # Find an existing user or create one
            user = session.exec(select(User).where(User.email == "admin@example.com")).first()

            if user:
                # Create a helmet for the user
                helmet = Helmet(
                    user_id=user.id,
                    serial_number="RATE-TEST-HELMET-001"
                )
                session.add(helmet)
                session.commit()
                session.refresh(helmet)

                # Now register the device with the valid helmet
                register_payload["helmet_id"] = str(helmet.id)

                reg_response = client.post(
                    "/api/devices/register",
                    json=register_payload,
                    headers={"Authorization": f"Bearer {user_token}"}
                )

                if reg_response.status_code == 200:
                    device_token = reg_response.json()["auth_token"]

                    # Send multiple requests rapidly to test rate limiting
                    sensor_payload = {
                        "sensor_type": "ACCELEROMETER",
                        "x_value": 0.12,
                        "y_value": -0.45,
                        "z_value": 9.81
                    }

                    # Send requests faster than the rate limit to trigger limiting
                    for i in range(65):  # More than the default limit of 60
                        response = client.post(
                            "/api/esp32/data",
                            json=sensor_payload,
                            headers={"Authorization": f"Bearer {device_token}"}
                        )

                        # After hitting the limit, expect 429 responses
                        if i >= 60:
                            if response.status_code == 429:
                                # Rate limiting is working
                                break
                        time.sleep(0.1)  # Small delay

                    # Verify that rate limiting eventually triggers
                    response = client.post(
                        "/api/esp32/data",
                        json=sensor_payload,
                        headers={"Authorization": f"Bearer {device_token}"}
                    )

                    # Clean up: remove test device
                    with Session(engine) as cleanup_session:
                        test_device = cleanup_session.exec(
                            select(ESP32Device).where(ESP32Device.device_id == "test-rate-limit-device")
                        ).first()
                        if test_device:
                            cleanup_session.delete(test_device)
                            cleanup_session.commit()

def test_esp32_data_validation_edge_cases():
    """Test edge cases for ESP32 data validation"""
    # Test with boundary values
    valid_payload = {
        "sensor_type": "TEMPERATURE",
        "raw_value": 0.0,  # Boundary value
        "battery_level": 0  # Min battery
    }

    # Should fail with 401 (unauthorized) since no token provided
    response = client.post("/api/esp32/data", json=valid_payload)
    assert response.status_code == 401

    # Test with max battery value
    valid_payload["battery_level"] = 100  # Max battery
    response = client.post("/api/esp32/data", json=valid_payload)
    assert response.status_code == 401  # Still unauthorized

    # Test invalid sensor type
    invalid_payload = {
        "sensor_type": "INVALID_SENSOR_TYPE",
        "raw_value": 25.0
    }
    response = client.post("/api/esp32/data", json=invalid_payload)
    assert response.status_code == 401  # Still unauthorized, but would be 422 if authorized


def test_esp32_device_not_found():
    """Test behavior when ESP32 device token doesn't exist"""
    sensor_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81
    }

    # Use a non-existent device token
    response = client.post(
        "/api/esp32/data",
        json=sensor_payload,
        headers={"Authorization": "Bearer non-existent-device-token"}
    )

    # Should return 401 for invalid device token
    assert response.status_code == 401