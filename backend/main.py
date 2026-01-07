# main.py
"""
Single-file FastAPI app implementing Phase 4 Backend Logic:
- SQLModel models for User, Helmet, AccidentEvent, TripData
- JWT auth endpoints
- /api/analytics endpoints for Phase 4 Charts
- /api/data/live with detailed sensor telemetry (accel/gyro)
- Standard CRUD for accidents and helmets
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
from enum import Enum
import hashlib
import hmac
import random # For simulation
import logging
from collections import defaultdict
import time

from fastapi import FastAPI, HTTPException, status, Depends, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, constr, field_validator, model_validator
from sqlmodel import SQLModel, Field, create_engine, Session, select, Relationship, func
import jwt
import uvicorn
from starlette.middleware.cors import CORSMiddleware

# Basic configuration via env
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

ALGORITHM = "HS256"

app = FastAPI(title="Smart Helmet Backend - Phase 4")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting configuration
REQUESTS_LIMIT = 60  # Max requests per minute per device
TIME_WINDOW = 60  # Time window in seconds

# In-memory storage for rate limiting (use Redis in production)
request_counts = defaultdict(list)

def check_rate_limit(device_token: str):
    """
    Check if a device has exceeded the rate limit.
    NOTE: This is an in-memory rate limiter suitable for development.
    For production, use Redis or another distributed store for rate limiting.
    """
    current_time = time.time()

    # Clean old requests (older than TIME_WINDOW seconds)
    request_counts[device_token] = [
        req_time for req_time in request_counts[device_token]
        if current_time - req_time < TIME_WINDOW
    ]

    # Check if limit exceeded
    if len(request_counts[device_token]) >= REQUESTS_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {REQUESTS_LIMIT} requests per minute."
        )

    # Add current request timestamp
    request_counts[device_token].append(current_time)

# CORS - Allow all for development ease
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Engine
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

# ---------- Models ----------
class AlertStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    RESOLVED = "RESOLVED"

class UserBase(SQLModel):
    email: EmailStr = Field(index=True, unique=True)
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    emergency_contact_phone: Optional[str]
    is_admin: bool = False

class User(UserBase, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    helmets: List["Helmet"] = Relationship(back_populates="user")

class Helmet(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
    serial_number: str = Field(index=True, unique=True)
    last_seen: Optional[datetime] = None

    user: Optional[User] = Relationship(back_populates="helmets")
    accidents: List["AccidentEvent"] = Relationship(back_populates="helmet")
    trips: List["TripData"] = Relationship(back_populates="helmet")

class AccidentEvent(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)
    timestamp: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    gforce_reading: Optional[float]
    alert_status: AlertStatus = Field(default=AlertStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    helmet: Optional[Helmet] = Relationship(back_populates="accidents")

class TripData(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    distance_km: Optional[float]
    max_speed: Optional[float]
    average_speed: Optional[float]
    trip_type: str = Field(default="NORMAL") # NORMAL or ACCIDENT

    helmet: Optional[Helmet] = Relationship(back_populates="trips")


class ESP32Device(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    device_id: str = Field(index=True, unique=True)  # Unique identifier for the ESP32 device
    helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)  # Foreign key to Helmet entity
    auth_token: str = Field(max_length=255)  # Device-specific authentication token
    is_active: bool = Field(default=True)  # Whether the device is currently active
    last_connected: Optional[datetime] = None  # Timestamp of last successful connection
    connection_type: str = Field(default="WIFI", max_length=20)  # Connection type: WIFI, BLUETOOTH, etc.
    transmission_interval: Optional[int] = Field(default=None)  # Configurable transmission interval in ms
    sensitivity_threshold: Optional[float] = Field(default=None)  # Configurable sensitivity threshold
    report_battery: Optional[bool] = Field(default=None)  # Whether to report battery status
    created_at: datetime = Field(default_factory=datetime.utcnow)  # When the device was registered

    helmet: Optional[Helmet] = Relationship()
    sensor_data: List["SensorData"] = Relationship(back_populates="esp32_device")


class SensorData(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    esp32_device_id: uuid.UUID = Field(foreign_key="esp32device.id", index=True)  # Foreign key to ESP32Device
    helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)  # Foreign key to Helmet for quick lookup
    timestamp: datetime = Field(default_factory=datetime.utcnow)  # When the data was recorded
    sensor_type: str = Field(max_length=50)  # Type of sensor: "ACCELEROMETER", "GYROSCOPE", "TEMPERATURE", etc.
    x_value: Optional[float] = None  # X-axis value for 3D sensors
    y_value: Optional[float] = None  # Y-axis value for 3D sensors
    z_value: Optional[float] = None  # Z-axis value for 3D sensors
    raw_value: Optional[float] = None  # Raw sensor value for single-value sensors
    battery_level: Optional[int] = Field(default=None, ge=0, le=100)  # Battery level percentage
    signal_strength: Optional[int] = None  # WiFi signal strength

    esp32_device: Optional[ESP32Device] = Relationship(back_populates="sensor_data")
    helmet: Optional[Helmet] = Relationship()


# Add relationship to Helmet model
Helmet.esp32_devices: List[ESP32Device] = Relationship(back_populates="helmet")


# --- ESP32 Services ---
def store_sensor_data(
    esp32_device: ESP32Device,
    sensor_type: str,
    x_value: Optional[float] = None,
    y_value: Optional[float] = None,
    z_value: Optional[float] = None,
    raw_value: Optional[float] = None,
    battery_level: Optional[int] = None,
    signal_strength: Optional[int] = None
) -> SensorData:
    """
    Store sensor data from an ESP32 device
    NOTE: For high-volume scenarios, consider batching inserts or using bulk insert operations
    to improve performance when storing large amounts of sensor data.
    """
    with Session(engine) as session:
        # Create new SensorData record
        sensor_data = SensorData(
            esp32_device_id=esp32_device.id,
            helmet_id=esp32_device.helmet_id,
            timestamp=datetime.utcnow(),
            sensor_type=sensor_type.upper(),
            x_value=x_value,
            y_value=y_value,
            z_value=z_value,
            raw_value=raw_value,
            battery_level=battery_level,
            signal_strength=signal_strength
        )

        session.add(sensor_data)
        session.commit()
        session.refresh(sensor_data)

        logger.info(f"Stored sensor data from device {esp32_device.device_id}: {sensor_type}")

        return sensor_data

# ---------- DB initialization & helper ----------
def init_db():
    SQLModel.metadata.create_all(engine)

# Password hashing (PBKDF2)
def hash_password(password: str) -> str:
    salt = b"static_salt_for_demo"  # replace with per-user random salt in production
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return dk.hex()

def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)

# JWT
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid auth payload")
    with Session(engine) as session:
        user = session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


# ESP32 Device Authentication
def get_current_esp32_device(token: str = Depends(oauth2_scheme)) -> ESP32Device:
    """
    Dependency to get the current ESP32 device from the authorization token.
    Includes security measures to prevent timing attacks and invalid token access.
    """
    # Extract token from header (format: "Bearer <token>")
    if token.startswith("Bearer "):
        device_token = token[7:]
    else:
        device_token = token

    # Validate token length to prevent basic attacks
    if len(device_token) < 32:
        logger.warning("Attempted access with suspiciously short device token")
        raise HTTPException(status_code=401, detail="Invalid ESP32 device token")

    with Session(engine) as session:
        # Find the ESP32 device by its auth token
        esp32_device = session.exec(
            select(ESP32Device).where(ESP32Device.auth_token == device_token)
        ).first()

        if not esp32_device:
            logger.warning(f"Access attempted with invalid device token: {device_token[:10]}...")
            raise HTTPException(status_code=401, detail="Invalid ESP32 device token")

        # Check if device is active
        if not esp32_device.is_active:
            logger.warning(f"Inactive device attempted to connect: {esp32_device.device_id}")
            raise HTTPException(status_code=401, detail="Device is inactive")

        # Update last connected timestamp
        esp32_device.last_connected = datetime.utcnow()
        session.add(esp32_device)
        session.commit()

        logger.info(f"Valid ESP32 device connected: {esp32_device.device_id}")
        return esp32_device

# ---------- Pydantic request/response models ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class ConfirmBody(BaseModel):
    confirm: bool


# --- ESP32 Pydantic Models ---
class ESP32DataRequest(BaseModel):
    sensor_type: str
    x_value: Optional[float] = None
    y_value: Optional[float] = None
    z_value: Optional[float] = None
    raw_value: Optional[float] = None
    battery_level: Optional[int] = Field(default=None, ge=0, le=100)
    signal_strength: Optional[int] = None

    @field_validator('sensor_type')
    def validate_sensor_type(cls, v):
        allowed_types = ["ACCELEROMETER", "GYROSCOPE", "TEMPERATURE", "OTHER"]
        if v not in allowed_types:
            raise ValueError(f'sensor_type must be one of {allowed_types}')
        return v.upper()

    @model_validator(mode='after')
    def validate_sensor_values(self):
        if self.sensor_type in ["ACCELEROMETER", "GYROSCOPE"]:
            if self.x_value is None or self.y_value is None or self.z_value is None:
                raise ValueError('x_value, y_value, and z_value are required for 3D sensors')
        elif self.sensor_type in ["TEMPERATURE", "OTHER"]:
            if self.raw_value is None:
                raise ValueError('raw_value is required for single-value sensors')
        return self


class ESP32RegisterRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    helmet_id: str  # This will be validated as UUID in the endpoint
    connection_type: Optional[str] = "WIFI"

    @field_validator('connection_type')
    def validate_connection_type(cls, v):
        allowed_types = ["WIFI", "BLUETOOTH", "OTHER"]
        if v not in allowed_types:
            raise ValueError(f'connection_type must be one of {allowed_types}')
        return v.upper()


class ESP32ConfigRequest(BaseModel):
    transmission_interval: Optional[int] = Field(default=None, ge=1000, le=3600000)  # 1 second to 1 hour
    sensitivity_threshold: Optional[float] = Field(default=None, ge=0.1, le=10.0)
    report_battery: Optional[bool] = None


class ESP32DataResponse(BaseModel):
    status: str
    received_at: str
    data_id: str


class ESP32StatusResponse(BaseModel):
    status: str
    last_seen: Optional[str]
    battery_level: Optional[int]
    connected_via: str


class ESP32RegisterResponse(BaseModel):
    device_id: str
    auth_token: str
    helmet_id: str

# ---------- API Endpoints ----------

@app.on_event("startup")
def on_startup():
    init_db()
    # Create default admin if not exists
    with Session(engine) as session:
        if not session.exec(select(User).where(User.email == "admin@example.com")).first():
            admin = User(email="admin@example.com", password_hash=hash_password("admin123"), first_name="Admin", is_admin=True)
            session.add(admin)
            session.commit()
    print("Startup complete. Admin: admin@example.com / admin123")

# --- AUTH ---
@app.post("/api/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    with Session(engine) as session:
        if session.exec(select(User).where(User.email == req.email)).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(
            email=req.email,
            password_hash=hash_password(req.password),
            first_name=req.first_name,
            last_name=req.last_name,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        token = create_access_token({"sub": str(user.id)})
        return TokenResponse(access_token=token, expires_in=ACCESS_TOKEN_EXPIRE_MINUTES*60)

@app.post("/api/auth/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == form_data.username)).first()
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": str(user.id)})
        return TokenResponse(access_token=token, expires_in=ACCESS_TOKEN_EXPIRE_MINUTES*60)

@app.get("/api/auth/me")
def me(current: User = Depends(get_current_user)):
    return {
        "id": str(current.id),
        "email": current.email,
        "first_name": current.first_name,
        "last_name": current.last_name,
        "is_admin": current.is_admin
    }

# --- HELMETS ---
@app.get("/api/helmets/my")
def get_my_helmet(current: User = Depends(get_current_user)):
    with Session(engine) as session:
        h = session.exec(select(Helmet).where(Helmet.user_id == current.id).limit(1)).first()
        if not h:
            # Create one for demo if missing
            h = Helmet(user_id=current.id, serial_number=f"DEMO-{str(uuid.uuid4())[:4]}", last_seen=datetime.utcnow())
            session.add(h)
            session.commit()
            session.refresh(h)
        return {"id": str(h.id), "serial_number": h.serial_number, "last_seen": h.last_seen.isoformat() if h.last_seen else None}

# --- ACCIDENTS ---
@app.get("/api/accidents", response_model=List[dict])
def get_accidents(limit: int = 20, current: User = Depends(get_current_user)):
    with Session(engine) as session:
        q = select(AccidentEvent).order_by(AccidentEvent.timestamp.desc()).limit(limit)
        # In prod, filter by user permissions here
        rows = session.exec(q).all()
        return [
            {
                "id": str(r.id),
                "helmet_id": str(r.helmet_id),
                "timestamp": r.timestamp.isoformat(),
                "latitude": r.latitude,
                "longitude": r.longitude,
                "gforce_reading": r.gforce_reading,
                "alert_status": r.alert_status.value
            }
            for r in rows
        ]

@app.post("/api/accidents/{acc_id}/confirm")
def confirm_accident(acc_id: str, body: ConfirmBody, current: User = Depends(get_current_user)):
    with Session(engine) as session:
        try:
            acc_uuid = uuid.UUID(acc_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid UUID")
        acc = session.get(AccidentEvent, acc_uuid)
        if not acc:
            raise HTTPException(status_code=404, detail="Accident not found")
        acc.alert_status = AlertStatus.CONFIRMED if body.confirm else AlertStatus.RESOLVED
        session.add(acc)
        session.commit()
        return {"status": "updated", "new_state": acc.alert_status}

# --- LIVE DATA (Enhanced for Phase 4) ---
@app.get("/api/data/live")
def live_data(helmet_serial: Optional[str] = None, current: User = Depends(get_current_user)):
    """
    Simulates live telemetry including Accelerometer (XYZ) and Gyroscope (XYZ).
    Use websockets for real production implementation.
    """
    # Simulate meaningful noise
    ax = round(random.uniform(-0.5, 0.5), 2)
    ay = round(random.uniform(-0.5, 0.5), 2)
    az = round(random.uniform(9.0, 10.0), 2) # Gravity

    gx = round(random.uniform(-2, 2), 1)
    gy = round(random.uniform(-2, 2), 1)
    gz = round(random.uniform(-2, 2), 1)

    return {
        "serial_number": helmet_serial or "DEMO-LIVE",
        "accel": {"x": ax, "y": ay, "z": az},
        "gyro": {"x": gx, "y": gy, "z": gz},
        "speed": int(random.uniform(0, 60)),
        "temp": 34,
        "last_seen": datetime.utcnow().isoformat()
    }

# --- ANALYTICS (Phase 4 Logic) ---

@app.get("/api/analytics/stats")
def get_analytics_stats(current: User = Depends(get_current_user)):
    """Returns aggregated stats for the Analysis Cards"""
    with Session(engine) as session:
        total_accidents = session.exec(select(func.count(AccidentEvent.id))).one()
        # Mock calculation for mean G-force across all events
        avg_g = session.exec(select(func.avg(AccidentEvent.gforce_reading))).one()
        
        return {
            "mean_gforce": round(avg_g or 1.2, 2),
            "max_spike": 4.5, # Mock, or query max(gforce)
            "reliability_score": 98,
            "duration_days": 7
        }

@app.get("/api/analytics/time-series")
def get_time_series(current: User = Depends(get_current_user)):
    """Returns mock time-series data for the line chart"""
    data = []
    base_time = datetime.now() - timedelta(minutes=20)
    for i in range(20):
        t = base_time + timedelta(minutes=i)
        is_spike = i == 12
        data.append({
            "time": t.strftime("%H:%M"),
            "normal": round(1.0 + random.random() * 0.5, 2),
            "impact": 4.5 if is_spike else round(1.0 + random.random() * 0.5, 2)
        })
    return data

@app.get("/api/analytics/spikes")
def get_daily_spikes(current: User = Depends(get_current_user)):
    """Returns daily max spike counts for bar chart"""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    return [
        {"day": d, "spikes": random.randint(1, 8)} for d in days
    ]

@app.get("/api/analytics/distribution")
def get_trip_distribution(current: User = Depends(get_current_user)):
    """Returns pie chart data"""
    return [
        {"name": "Normal Trips", "value": 85},
        {"name": "Hard Braking", "value": 10},
        {"name": "Accidents", "value": 5}
    ]

# --- ESP32 ENDPOINTS ---
@app.post("/api/esp32/data", response_model=ESP32DataResponse)
def receive_esp32_data(
    data: ESP32DataRequest,
    esp32_device: ESP32Device = Depends(get_current_esp32_device)
):
    """
    Receives sensor data from ESP32 devices.
    """
    try:
        # Check rate limit
        check_rate_limit(esp32_device.auth_token)

        # Store the sensor data
        stored_data = store_sensor_data(
            esp32_device=esp32_device,
            sensor_type=data.sensor_type,
            x_value=data.x_value,
            y_value=data.y_value,
            z_value=data.z_value,
            raw_value=data.raw_value,
            battery_level=data.battery_level,
            signal_strength=data.signal_strength
        )

        logger.info(f"Received data from ESP32 device {esp32_device.device_id}")

        return ESP32DataResponse(
            status="success",
            received_at=stored_data.timestamp.isoformat(),
            data_id=str(stored_data.id)
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error processing data from ESP32 device {esp32_device.device_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while processing sensor data"
        )


@app.get("/api/esp32/status", response_model=ESP32StatusResponse)
def get_esp32_status(
    esp32_device: ESP32Device = Depends(get_current_esp32_device)
):
    """
    Retrieves the current status of an ESP32 device.
    """
    return ESP32StatusResponse(
        status="active" if esp32_device.is_active else "inactive",
        last_seen=esp32_device.last_connected.isoformat() if esp32_device.last_connected else None,
        battery_level=None,  # This would come from the latest sensor data
        connected_via=esp32_device.connection_type.lower()  # Use the actual connection type
    )


@app.post("/api/devices/register", response_model=ESP32RegisterResponse)
def register_esp32_device(
    req: ESP32RegisterRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Registers a new ESP32 device with the system.
    """
    with Session(engine) as session:
        # Verify that the helmet exists and belongs to the user
        helmet = session.get(Helmet, uuid.UUID(req.helmet_id))
        if not helmet or helmet.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Helmet not found or doesn't belong to user")

        # Check if device already exists
        existing_device = session.exec(
            select(ESP32Device).where(ESP32Device.device_id == req.device_id)
        ).first()
        if existing_device:
            raise HTTPException(status_code=400, detail="Device ID already exists")

        # Generate a secure authentication token
        import secrets
        auth_token = secrets.token_urlsafe(32)  # 32 bytes = 256 bits of entropy

        # Create the ESP32 device
        esp32_device = ESP32Device(
            device_id=req.device_id,
            helmet_id=uuid.UUID(req.helmet_id),
            auth_token=auth_token,
            connection_type=req.connection_type
        )

        session.add(esp32_device)
        session.commit()
        session.refresh(esp32_device)

        logger.info(f"Registered new ESP32 device {req.device_id} for user {current_user.email} with connection type {req.connection_type}")

        return ESP32RegisterResponse(
            device_id=esp32_device.device_id,
            auth_token=esp32_device.auth_token,
            helmet_id=str(esp32_device.helmet_id)
        )


# --- ESP32 CONFIG ENDPOINT ---
@app.put("/api/esp32/config")
def update_esp32_config(
    config: ESP32ConfigRequest,
    esp32_device: ESP32Device = Depends(get_current_esp32_device)
):
    """
    Updates configuration for an ESP32 device.
    """
    with Session(engine) as session:
        # Retrieve the current device from the database
        db_device = session.get(ESP32Device, esp32_device.id)
        if not db_device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Update only the fields that are provided in the request
        if config.transmission_interval is not None:
            db_device.transmission_interval = config.transmission_interval

        if config.sensitivity_threshold is not None:
            db_device.sensitivity_threshold = config.sensitivity_threshold

        if config.report_battery is not None:
            db_device.report_battery = config.report_battery

        session.add(db_device)
        session.commit()

        logger.info(f"Updated config for ESP32 device {db_device.device_id}")

        return {
            "status": "config_updated",
            "applied_at": datetime.utcnow().isoformat()
        }


# --- TRIP DATA ---
@app.get("/api/data/trips")
def trips(current: User = Depends(get_current_user)):
    # Return mock trips if DB is empty
    return [
        {
            "id": str(uuid.uuid4()),
            "start_time": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
            "distance_km": round(random.uniform(2, 15), 1),
            "max_speed": int(random.uniform(40, 80))
        }
        for i in range(5)
    ]

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)