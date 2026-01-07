import pytest
from fastapi.testclient import TestClient
from backend.main import app, ESP32Device, SensorData, Helmet, User, Session, engine
from sqlmodel import select
import uuid

client = TestClient(app)

def test_secure_data_transmission_integration():
    """Integration test for secure data transmission"""
    # Setup: Create test user, helmet, and ESP32 device
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="security-test@example.com",
            password_hash="test_hash",
            first_name="Security",
            last_name="Test"
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create a test helmet
        helmet = Helmet(
            user_id=user.id,
            serial_number="SECURITY-TEST-HELMET-001"
        )
        session.add(helmet)
        session.commit()
        session.refresh(helmet)

        # Create a test ESP32 device with a secure token
        device = ESP32Device(
            device_id="security-test-esp32-device",
            helmet_id=helmet.id,
            auth_token="secure-device-token-1234567890abcdef"
        )
        session.add(device)
        session.commit()
        session.refresh(device)

    # Test that valid authentication works for data transmission
    sensor_payload = {
        "sensor_type": "ACCELEROMETER",
        "x_value": 0.12,
        "y_value": -0.45,
        "z_value": 9.81,
        "battery_level": 85,
        "signal_strength": -55
    }

    response = client.post(
        "/api/esp32/data",
        json=sensor_payload,
        headers={"Authorization": "Bearer secure-device-token-1234567890abcdef"}
    )

    # Should succeed with 200 status
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"
    assert "received_at" in response_data
    assert "data_id" in response_data

    # Test that invalid authentication fails
    response = client.post(
        "/api/esp32/data",
        json=sensor_payload,
        headers={"Authorization": "Bearer invalid-device-token"}
    )

    # Should return 401 for invalid token
    assert response.status_code == 401

    # Test that no authentication fails
    response = client.post(
        "/api/esp32/data",
        json=sensor_payload
    )

    # Should return 401 for missing auth
    assert response.status_code == 401

    # Clean up test data
    with Session(engine) as session:
        session.exec(SensorData.__table__.delete().where(SensorData.helmet_id == helmet.id))
        session.exec(ESP32Device.__table__.delete().where(ESP32Device.helmet_id == helmet.id))
        session.exec(Helmet.__table__.delete().where(Helmet.id == helmet.id))
        session.exec(User.__table__.delete().where(User.id == user.id))
        session.commit()


def test_device_registration_security():
    """Test secure device registration process"""
    # First, login to get a user token for registration
    login_response = client.post(
        "/api/auth/login",
        data={"username": "admin@example.com", "password": "admin123"}
    )

    if login_response.status_code == 200:
        user_token = login_response.json()["access_token"]

        # Test registering a device with proper user authentication
        register_payload = {
            "device_id": "test-secure-device-123",
            "helmet_id": "12345678-1234-5678-1234-123456789012"  # This will fail as helmet doesn't exist
        }

        response = client.post(
            "/api/devices/register",
            json=register_payload,
            headers={"Authorization": f"Bearer {user_token}"}
        )

        # Should return 404 because helmet doesn't exist
        assert response.status_code == 404

        # Now test without user authentication
        response = client.post(
            "/api/devices/register",
            json=register_payload
        )

        # Should return 401 for missing user auth
        assert response.status_code == 401