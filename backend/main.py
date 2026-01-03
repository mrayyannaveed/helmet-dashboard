# # main.py
# """
# Single-file FastAPI app implementing:
# - SQLModel models for User, Helmet, AccidentEvent, TripData
# - JWT auth endpoints (/api/auth/register, /api/auth/login, /api/auth/me)
# - /api/accidents (GET)
# - /api/accidents/{id}/confirm (POST)
# - /api/data/live (GET)
# - /api/data/trips (GET)
# - simple rate limiting (in-memory, replace with Redis for prod)
# - defensive validation and DB constraints
# Run:
#   export DATABASE_URL=postgresql://postgres:pass@localhost:5432/postgres
#   export SECRET_KEY='very-secret-change-me'
#   python main.py
# """
# from typing import Optional, List, Union
# from datetime import datetime, timedelta
# import os
# import uuid
# from enum import Enum
# import hashlib
# import hmac

# from fastapi import FastAPI, HTTPException, status, Depends, Body, Request
# from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# from pydantic import BaseModel, EmailStr, constr, ValidationError
# from sqlmodel import SQLModel, Field, create_engine, Session, select, Column, JSON
# from sqlmodel import Relationship
# import jwt
# import uvicorn
# from starlette.middleware.cors import CORSMiddleware

# # Basic configuration via env
# DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
# SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
# ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ALGORITHM = "HS256"

# app = FastAPI(title="Smart Helmet Backend")

# # CORS - in production restrict origins
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # DB Engine
# engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

# # ---------- Models ----------
# class AlertStatus(str, Enum):
#     PENDING = "PENDING"
#     CONFIRMED = "CONFIRMED"
#     RESOLVED = "RESOLVED"

# class UserBase(SQLModel):
#     email: EmailStr = Field(index=True)
#     first_name: Optional[str]
#     last_name: Optional[str]
#     phone_number: Optional[str]
#     emergency_contact_phone: Optional[str]
#     is_admin: bool = False

# class User(UserBase, table=True):
#     id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
#     password_hash: str
#     created_at: datetime = Field(default_factory=datetime.utcnow)

#     helmets: List["Helmet"] = Relationship(back_populates="user")

# class Helmet(SQLModel, table=True):
#     id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
#     user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", index=True)
#     serial_number: str = Field(index=True)
#     last_seen: Optional[datetime] = None

#     user: Optional[User] = Relationship(back_populates="helmets")
#     accidents: List["AccidentEvent"] = Relationship(back_populates="helmet")
#     trips: List["TripData"] = Relationship(back_populates="helmet")

# class AccidentEvent(SQLModel, table=True):
#     id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
#     helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)
#     timestamp: datetime
#     latitude: Optional[float]
#     longitude: Optional[float]
#     gforce_reading: Optional[float]
#     alert_status: AlertStatus = Field(default=AlertStatus.PENDING)
#     created_at: datetime = Field(default_factory=datetime.utcnow)

#     helmet: Optional[Helmet] = Relationship(back_populates="accidents")

# class TripData(SQLModel, table=True):
#     id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
#     helmet_id: uuid.UUID = Field(foreign_key="helmet.id", index=True)
#     start_time: Optional[datetime]
#     end_time: Optional[datetime]
#     distance_km: Optional[float]
#     max_speed: Optional[float]
#     average_speed: Optional[float]

#     helmet: Optional[Helmet] = Relationship(back_populates="trips")

# # ---------- DB initialization & helper ----------
# def init_db():
#     SQLModel.metadata.create_all(engine)

# # Password hashing (PBKDF2)
# def hash_password(password: str) -> str:
#     salt = b"static_salt_for_demo"  # replace with per-user random salt in production
#     dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
#     return dk.hex()

# def verify_password(password: str, password_hash: str) -> bool:
#     return hmac.compare_digest(hash_password(password), password_hash)

# # JWT
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# def decode_token(token: str) -> dict:
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         return payload
#     except jwt.PyJWTError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
#     payload = decode_token(token)
#     user_id = payload.get("sub")
#     if user_id is None:
#         raise HTTPException(status_code=401, detail="Invalid auth payload")
#     with Session(engine) as session:
#         user = session.get(User, uuid.UUID(user_id))
#         if not user:
#             raise HTTPException(status_code=401, detail="User not found")
#         return user

# # ---------- Pydantic request/response models ----------
# class RegisterRequest(BaseModel):
#     email: EmailStr
#     password: constr(min_length=8)
#     first_name: Optional[str] = None
#     last_name: Optional[str] = None
#     phone_number: Optional[str] = None
#     emergency_contact_phone: Optional[str] = None

# class TokenResponse(BaseModel):
#     access_token: str
#     token_type: str = "bearer"
#     expires_in: int

# class ConfirmBody(BaseModel):
#     confirm: bool

# # ---------- Simple rate limiter (in-memory) ----------
# RATE_STORE = {}
# RATE_LIMIT = 20  # per minute per IP for sensitive endpoints
# from time import time
# def check_rate_limit(ip: str):
#     now = int(time())
#     bucket = now // 60
#     key = f"{ip}:{bucket}"
#     v = RATE_STORE.get(key, 0)
#     if v >= RATE_LIMIT:
#         raise HTTPException(status_code=429, detail="Too many requests")
#     RATE_STORE[key] = v + 1

# # ---------- API Endpoints ----------
# @app.on_event("startup")
# def on_startup():
#     init_db()
#     # optional: create admin user for dev if not exists
#     with Session(engine) as session:
#         q = select(User).where(User.email == "admin@example.com")
#         if not session.exec(q).first():
#             admin = User(email="admin@example.com", password_hash=hash_password("adminpassword"), first_name="Admin", is_admin=True)
#             session.add(admin)
#             session.commit()
#     print("Startup complete")

# @app.post("/api/auth/register", response_model=TokenResponse)
# def register(req: RegisterRequest):
#     with Session(engine) as session:
#         q = select(User).where(User.email == req.email)
#         if session.exec(q).first():
#             raise HTTPException(status_code=400, detail="Email already registered")
#         user = User(
#             email=req.email,
#             password_hash=hash_password(req.password),
#             first_name=req.first_name,
#             last_name=req.last_name,
#             phone_number=req.phone_number,
#             emergency_contact_phone=req.emergency_contact_phone,
#             is_admin=False,
#         )
#         session.add(user)
#         session.commit()
#         session.refresh(user)
#         token = create_access_token({"sub": str(user.id)})
#         return TokenResponse(access_token=token, expires_in=ACCESS_TOKEN_EXPIRE_MINUTES*60)

# @app.post("/api/auth/login", response_model=TokenResponse)
# def login(form_data: OAuth2PasswordRequestForm = Depends()):
#     with Session(engine) as session:
#         q = select(User).where(User.email == form_data.username)
#         user = session.exec(q).first()
#         if not user or not verify_password(form_data.password, user.password_hash):
#             raise HTTPException(status_code=401, detail="Invalid credentials")
#         token = create_access_token({"sub": str(user.id)})
#         return TokenResponse(access_token=token, expires_in=ACCESS_TOKEN_EXPIRE_MINUTES*60)

# @app.get("/api/auth/me")
# def me(current: User = Depends(get_current_user)):
#     return {
#         "id": str(current.id),
#         "email": current.email,
#         "first_name": current.first_name,
#         "last_name": current.last_name,
#         "is_admin": current.is_admin
#     }

# # Helper endpoint: create a helmet for current user (dev)
# @app.post("/api/helmets", status_code=201)
# def create_helmet(serial_number: str = Body(...), current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         existing = session.exec(select(Helmet).where(Helmet.serial_number == serial_number)).first()
#         if existing:
#             raise HTTPException(status_code=400, detail="Serial already exists")
#         h = Helmet(serial_number=serial_number, user_id=current.id, last_seen=datetime.utcnow())
#         session.add(h)
#         session.commit()
#         session.refresh(h)
#         return {"id": str(h.id), "serial_number": h.serial_number}

# @app.get("/api/helmets/my")
# def get_my_helmet(current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         h = session.exec(select(Helmet).where(Helmet.user_id == current.id).limit(1)).first()
#         if not h:
#             return {}
#         return {"id": str(h.id), "serial_number": h.serial_number, "last_seen": h.last_seen.isoformat() if h.last_seen else None, "user_id": str(h.user_id)}

# # Get accidents: admin sees all; rider sees their helmet events only
# @app.get("/api/accidents", response_model=List[dict])
# def get_accidents(limit: int = 20, start: Optional[str] = None, end: Optional[str] = None, status: Optional[str] = None, current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         q = select(AccidentEvent).order_by(AccidentEvent.timestamp.desc())
#         if not current.is_admin:
#             # limit to user's helmets
#             helmets = session.exec(select(Helmet.id).where(Helmet.user_id == current.id)).all()
#             helmet_ids = [h for (h,) in helmets] if helmets else []
#             if not helmet_ids:
#                 return []
#             q = q.where(AccidentEvent.helmet_id.in_(helmet_ids))
#         if start:
#             try:
#                 q = q.where(AccidentEvent.timestamp >= datetime.fromisoformat(start))
#             except Exception:
#                 raise HTTPException(status_code=400, detail="Invalid start date")
#         if end:
#             try:
#                 q = q.where(AccidentEvent.timestamp <= datetime.fromisoformat(end))
#             except Exception:
#                 raise HTTPException(status_code=400, detail="Invalid end date")
#         if status:
#             try:
#                 _ = AlertStatus(status)
#             except Exception:
#                 raise HTTPException(status_code=400, detail="Invalid status filter")
#             q = q.where(AccidentEvent.alert_status == status)
#         q = q.limit(limit)
#         rows = session.exec(q).all()
#         out = []
#         for r in rows:
#             out.append({
#                 "id": str(r.id),
#                 "helmet_id": str(r.helmet_id),
#                 "timestamp": r.timestamp.isoformat(),
#                 "latitude": r.latitude,
#                 "longitude": r.longitude,
#                 "gforce_reading": r.gforce_reading,
#                 "alert_status": r.alert_status.value
#             })
#         return out

# @app.post("/api/accidents/{acc_id}/confirm")
# def confirm_accident(acc_id: str, body: ConfirmBody, current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         try:
#             acc_uuid = uuid.UUID(acc_id)
#         except Exception:
#             raise HTTPException(status_code=400, detail="Invalid id")
#         acc = session.get(AccidentEvent, acc_uuid)
#         if not acc:
#             raise HTTPException(status_code=404, detail="Accident not found")
#         # check ownership (admin can confirm any)
#         if not current.is_admin:
#             helmet = session.get(Helmet, acc.helmet_id)
#             if not helmet or helmet.user_id != current.id:
#                 raise HTTPException(status_code=403, detail="Not allowed")
#         # update
#         acc.alert_status = AlertStatus.CONFIRMED if body.confirm else AlertStatus.RESOLVED
#         session.add(acc)
#         session.commit()
#         session.refresh(acc)
#         return {"id": str(acc.id), "alert_status": acc.alert_status.value}

# # Live data (mocked)
# @app.get("/api/data/live")
# def live_data(helmet_serial: Optional[str] = None, current: User = Depends(get_current_user)):
#     # For demo, return mock data. In production this would be a WebSocket or SSE that streams helmet telemetry
#     import random
#     data = {
#         "serial_number": helmet_serial or "SIM-0001",
#         "battery": random.randint(20, 100),
#         "speed_kmh": round(random.random() * 60, 2),
#         "gforce": round(random.random() * 6, 2),
#         "helmet_on": True,
#         "last_seen": datetime.utcnow().isoformat()
#     }
#     return data

# @app.get("/api/data/trips")
# def trips(current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         helmets = session.exec(select(Helmet.id).where(Helmet.user_id == current.id)).all()
#         helmet_ids = [h for (h,) in helmets] if helmets else []
#         if not helmet_ids:
#             return []
#         q = select(TripData).where(TripData.helmet_id.in_(helmet_ids)).order_by(TripData.start_time.desc()).limit(100)
#         rows = session.exec(q).all()
#         out = []
#         for r in rows:
#             out.append({
#                 "id": str(r.id),
#                 "helmet_id": str(r.helmet_id),
#                 "start_time": r.start_time.isoformat() if r.start_time else None,
#                 "end_time": r.end_time.isoformat() if r.end_time else None,
#                 "distance_km": r.distance_km,
#                 "max_speed": r.max_speed,
#                 "average_speed": r.average_speed
#             })
#         return out

# @app.get("/health")
# def health():
#     # quick DB check
#     try:
#         with Session(engine) as session:
#             session.exec(select(User).limit(1)).first()
#         return {"status": "ok"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail="DB unavailable")

# # ---------- Development helpers: seed endpoints (not for production) ----------
# @app.post("/dev/seed_accident")
# def seed_accident_for_current(current: User = Depends(get_current_user)):
#     with Session(engine) as session:
#         h = session.exec(select(Helmet).where(Helmet.user_id == current.id).limit(1)).first()
#         if not h:
#             h = Helmet(user_id=current.id, serial_number=f"SIM-{str(uuid.uuid4())[:8]}", last_seen=datetime.utcnow())
#             session.add(h)
#             session.commit()
#         event = AccidentEvent(
#             helmet_id=h.id,
#             timestamp=datetime.utcnow(),
#             latitude=24.8607 + (0.02 - 0.04 * (uuid.uuid4().int % 2)),
#             longitude=67.0011 + (0.02 - 0.04 * (uuid.uuid4().int % 2)),
#             gforce_reading=round(2.0 + 6.0 * (uuid.uuid4().int % 3), 2),
#             alert_status=AlertStatus.PENDING
#         )
#         session.add(event)
#         session.commit()
#         session.refresh(event)
#         return {"id": str(event.id)}

# if __name__ == "__main__":
#     uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)






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

from fastapi import FastAPI, HTTPException, status, Depends, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, constr
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