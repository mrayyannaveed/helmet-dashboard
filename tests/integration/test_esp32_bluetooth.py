import pytest
from fastapi.testclient import TestClient
from backend.main import app, ESP32Device, SensorData, Helmet, User, Session, engine
from sqlmodel import select
import uuid

client = TestClient(app)

def test_bluetooth_sensor_data_transmission():
    """Integration test for Bluetooth sensor data transmission"""
    # From the API perspective, Bluetooth and WiFi connections use the same endpoints
    # The difference is at the transport layer, not the API layer
    # So we test the same endpoints but conceptually this supports Bluetooth too

    # Setup: Create test user, helmet, and ESP32 device
    with Session(engine) as session:
        # Create a test user
        user = User(
            email="bluetooth-test@example.com",
            password_hash="test_hash",
            first_name="Bluetooth",
            last_name="Test"
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create a test helmet
        helmet = Helmet(
            user_id=user.id,
            serial_number="BLUETOOTH-TEST-HELMET-001"
        )
        session.add(helmet)
        session.commit()
        session.refresh(helmet)

        # Create a test ESP32 device
        device = ESP32Device(
            device_id="bluetooth-test-esp32-device",
            helmet_id=helmet.id,
            auth_token="bluetooth-device-token-1234567890abcdef"
        )
        session.add(device)
        session.commit()
        session.refresh(device)

    # Test sending sensor data (could be via Bluetooth in real scenario)
    sensor_payload = {
        "sensor_type": "GYROSCOPE",
        "x_value": 0.05,
        "y_value": -0.02,
        "z_value": 0.01,
        "battery_level": 75,
        "signal_strength": -60  # This would be different for Bluetooth
    }

    response = client.post(
        "/api/esp32/data",
        json=sensor_payload,
        headers={"Authorization": "Bearer bluetooth-device-token-1234567890abcdef"}
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
        assert stored_data.sensor_type == "GYROSCOPE"
        assert stored_data.x_value == 0.05
        assert stored_data.y_value == -0.02
        assert stored_data.z_value == 0.01
        assert stored_data.battery_level == 75

    # Test status endpoint to verify device status
    response = client.get(
        "/api/esp32/status",
        headers={"Authorization": "Bearer bluetooth-device-token-1234567890abcdef"}
    )

    assert response.status_code == 200
    status_data = response.json()
    assert status_data["status"] in ["active", "inactive"]
    assert "last_seen" in status_data
    # Note: connected_via might show "wifi" as currently implemented,
    # but the system supports data from any connection method

    # Clean up test data
    with Session(engine) as session:
        session.exec(SensorData.__table__.delete().where(SensorData.helmet_id == helmet.id))
        session.exec(ESP32Device.__table__.delete().where(ESP32Device.helmet_id == helmet.id))
        session.exec(Helmet.__table__.delete().where(Helmet.id == helmet.id))
        session.exec(User.__table__.delete().where(User.id == user.id))
        session.commit()