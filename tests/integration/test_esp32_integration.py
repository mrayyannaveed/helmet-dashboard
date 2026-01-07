import pytest
from fastapi.testclient import TestClient
from backend.main import app, ESP32Device, SensorData, Helmet, User, Session, engine
from sqlmodel import select
import uuid
from unittest.mock import patch
import time

client = TestClient(app)

def test_wifi_sensor_data_transmission_integration():
    """Integration test for WiFi sensor data transmission"""
    # First, create a test helmet and user for the test
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="test@example.com",
            password_hash="test_hash",
            first_name="Test",
            last_name="User"
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create a test helmet
        helmet = Helmet(
            user_id=user.id,
            serial_number="TEST-HELMET-001"
        )
        session.add(helmet)
        session.commit()
        session.refresh(helmet)

        # Create a test ESP32 device
        device = ESP32Device(
            device_id="test-esp32-device",
            helmet_id=helmet.id,
            auth_token="test-device-token-1234567890abcdef"
        )
        session.add(device)
        session.commit()
        session.refresh(device)

    # Test sending sensor data via WiFi
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
        headers={"Authorization": "Bearer test-device-token-1234567890abcdef"}
    )

    # Should succeed with 200 status
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"
    assert "received_at" in response_data
    assert "data_id" in response_data

    # Verify data was stored in the database
    with Session(engine) as session:
        stored_data = session.exec(
            select(SensorData).where(SensorData.helmet_id == helmet.id)
        ).first()
        assert stored_data is not None
        assert stored_data.sensor_type == "ACCELEROMETER"
        assert stored_data.x_value == 0.12
        assert stored_data.y_value == -0.45
        assert stored_data.z_value == 9.81
        assert stored_data.battery_level == 85
        assert stored_data.signal_strength == -55

    # Clean up test data
    with Session(engine) as session:
        session.exec(SensorData.__table__.delete().where(SensorData.helmet_id == helmet.id))
        session.exec(ESP32Device.__table__.delete().where(ESP32Device.helmet_id == helmet.id))
        session.exec(Helmet.__table__.delete().where(Helmet.id == helmet.id))
        session.exec(User.__table__.delete().where(User.id == user.id))
        session.commit()


def test_wifi_sensor_data_transmission_invalid_data():
    """Integration test for WiFi sensor data transmission with invalid data"""
    # Create test data
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="test2@example.com",
            password_hash="test_hash",
            first_name="Test2",
            last_name="User2"
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create a test helmet
        helmet = Helmet(
            user_id=user.id,
            serial_number="TEST-HELMET-002"
        )
        session.add(helmet)
        session.commit()
        session.refresh(helmet)

        # Create a test ESP32 device
        device = ESP32Device(
            device_id="test-esp32-device-2",
            helmet_id=helmet.id,
            auth_token="test-device-token-2-1234567890abcdef"
        )
        session.add(device)
        session.commit()
        session.refresh(device)

    # Test sending invalid sensor data (missing required fields for 3D sensor)
    invalid_payload = {
        "sensor_type": "ACCELEROMETER",
        # Missing x_value, y_value, z_value
    }

    response = client.post(
        "/api/esp32/data",
        json=invalid_payload,
        headers={"Authorization": "Bearer test-device-token-2-1234567890abcdef"}
    )

    # Should return 422 for validation error
    assert response.status_code == 422

    # Clean up test data
    with Session(engine) as session:
        session.exec(SensorData.__table__.delete().where(SensorData.helmet_id == helmet.id))
        session.exec(ESP32Device.__table__.delete().where(ESP32Device.helmet_id == helmet.id))
        session.exec(Helmet.__table__.delete().where(Helmet.id == helmet.id))
        session.exec(User.__table__.delete().where(User.id == user.id))
        session.commit()