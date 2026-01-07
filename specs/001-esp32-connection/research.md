# Research: ESP32 Connection Endpoints

## Decision: WiFi and Bluetooth Connection Approach
**Rationale**: The ESP32 microcontroller has built-in WiFi capabilities and can support Bluetooth Classic/Bluetooth LE. For this implementation, we'll focus on HTTP-based communication over WiFi since the existing backend is already a web API. Bluetooth connectivity would typically require a separate gateway or intermediate device to bridge Bluetooth to HTTP, so the primary implementation will focus on WiFi-based communication with a potential future extension for Bluetooth.

## Decision: Authentication Method for ESP32 Devices
**Rationale**: Based on the existing authentication patterns in the backend (JWT for users), ESP32 devices will use device-specific tokens rather than JWTs. This is more appropriate for IoT devices and avoids the complexity of managing user sessions for hardware devices. Device tokens will be issued during device registration and rotated periodically for security.

## Decision: Data Format and Validation
**Rationale**: ESP32 devices will send sensor data in JSON format compatible with the existing SensorData model. The backend will validate the format and reject malformed data as specified in FR-004. Using JSON ensures compatibility with the existing data processing pipeline.

## Decision: Rate Limiting Implementation
**Rationale**: To prevent abuse of the endpoints as required by FR-009, we'll implement rate limiting using a sliding window approach. Each ESP32 device will be limited to a configurable number of requests per minute to prevent flooding the backend.

## Alternatives Considered:
1. **Direct Bluetooth to Backend**: Rejected because it requires special infrastructure to handle Bluetooth connections at the server level, which is complex and not typical for web backends.
2. **MQTT Protocol**: Considered but rejected for initial implementation as it would require additional infrastructure (MQTT broker) beyond the existing HTTP-based backend.
3. **Certificate-based Authentication**: Considered but device tokens are simpler to implement and rotate for IoT scenarios.

## Key Findings:
- ESP32 can connect to backend via HTTP over WiFi using standard HTTP libraries
- Existing backend can handle ESP32 authentication separately from user authentication
- Current database schema can accommodate ESP32 sensor data with minimal modifications
- Rate limiting is essential to prevent denial-of-service from malfunctioning devices