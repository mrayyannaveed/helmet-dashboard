# Quickstart: ESP32 Connection Endpoints

## Overview
This guide explains how to set up and use the ESP32 connection endpoints in the Smart Helmet system.

## Prerequisites
- ESP32 microcontroller with WiFi capability
- Smart Helmet registered in the system
- Backend server running and accessible

## Setup Process

### 1. Device Registration
Register your ESP32 device with the backend to obtain an authentication token:
```bash
curl -X POST "http://backend-server/api/devices/register" \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "esp32-device-unique-id",
    "helmet_id": "helmet-uuid-associated-with-this-device"
  }'
```

### 2. ESP32 Configuration
Configure your ESP32 with the authentication token and backend server URL. Example Arduino code:
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";
const char* server_url = "http://your-backend-server/api/esp32/data";
const char* auth_token = "device-specific-auth-token";

void sendSensorData(float x, float y, float z) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(server_url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(auth_token));

    String jsonData = "{\"sensor_type\":\"ACCELEROMETER\",\"x_value\":" + String(x) + ",\"y_value\":" + String(y) + ",\"z_value\":" + String(z) + "}";

    int httpResponseCode = http.POST(jsonData);
    http.end();
  }
}
```

### 3. Sending Data
Send sensor data to the backend using HTTP POST requests:
```bash
curl -X POST "http://backend-server/api/esp32/data" \
  -H "Authorization: Bearer <esp32-device-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_type": "ACCELEROMETER",
    "x_value": 0.12,
    "y_value": -0.45,
    "z_value": 9.81,
    "battery_level": 85,
    "signal_strength": -55
  }'
```

## Available Endpoints

### POST /api/esp32/data
Receives sensor data from ESP32 devices.
- Authentication: Device token (Bearer)
- Request body: JSON with sensor data
- Response: 200 OK on success, 400 Bad Request on invalid data, 401 Unauthorized on invalid token

### GET /api/esp32/status
Checks the connection status of an ESP32 device.
- Authentication: Device token (Bearer)
- Response: Device status information

## Testing
Mock requests can be sent using curl to test the endpoints before connecting actual hardware.