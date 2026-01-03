export type AlertStatus = "PENDING" | "CONFIRMED" | "RESOLVED";

export type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
};

export type Helmet = {
  id: string;
  user_id?: string;
  serial_number: string;
  last_seen?: string | null;
};

export type AccidentEvent = {
  id: string;
  helmet_id: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  gforce_reading?: number | null;
  alert_status: AlertStatus;
};

export type TripData = {
  id: string;
  helmet_id: string;
  start_time?: string | null;
  end_time?: string | null;
  distance_km?: number | null;
  max_speed?: number | null;
  average_speed?: number | null;
};