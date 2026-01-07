# Data Model: ESP32 Connection Endpoints

## ESP32Device Entity
Represents a physical ESP32 microcontroller with unique device ID, authentication credentials, and associated helmet

**Fields:**
- id: UUID (Primary Key)
- device_id: String (Unique identifier for the ESP32 device)
- helmet_id: UUID (Foreign key to Helmet entity)
- auth_token: String (Device-specific authentication token)
- is_active: Boolean (Whether the device is currently active)
- last_connected: DateTime (Timestamp of last successful connection)
- created_at: DateTime (When the device was registered)

**Validation Rules:**
- device_id must be unique across all ESP32 devices
- auth_token must be at least 32 characters long for security
- helmet_id must reference an existing helmet in the system

## SensorData Entity
Represents telemetry data from the helmet including accelerometer, gyroscope, temperature, and other sensor readings with timestamp and device identifier

**Fields:**
- id: UUID (Primary Key)
- esp32_device_id: UUID (Foreign key to ESP32Device)
- helmet_id: UUID (Foreign key to Helmet for quick lookup)
- timestamp: DateTime (When the data was recorded)
- sensor_type: String (Type of sensor: "ACCELEROMETER", "GYROSCOPE", "TEMPERATURE", etc.)
- x_value: Float (X-axis value for 3D sensors)
- y_value: Float (Y-axis value for 3D sensors)
- z_value: Float (Z-axis value for 3D sensors)
- raw_value: Float (Raw sensor value for single-value sensors)
- battery_level: Integer (Battery level percentage)
- signal_strength: Integer (WiFi signal strength)

**Validation Rules:**
- All sensor values must be within acceptable ranges
- timestamp must not be in the future
- x_value, y_value, z_value are required for 3D sensors
- raw_value is required for single-value sensors
- battery_level must be between 0 and 100

## Relationships
- ESP32Device has a one-to-many relationship with SensorData (one device can send multiple data points)
- ESP32Device has a many-to-one relationship with Helmet (each device is associated with one helmet)

## State Transitions
- ESP32Device: INACTIVE → ACTIVE (when first connection is established)
- ESP32Device: ACTIVE → INACTIVE (when device stops connecting for extended period)