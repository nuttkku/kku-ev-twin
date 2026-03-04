-- Digital Twin EV Bus — KKU Database Schema
-- Tables used by simulation runtime logging only.
-- Route/stop/charger data lives in backend/src/kku-routes.js (in-memory).

-- Routes (reference only — simulation uses kku-routes.js in-memory data)
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  description TEXT
);

-- Bus stops (reference only — served from bus_stop.geojson file, not this table)
CREATE TABLE stops (
  id SERIAL PRIMARY KEY,
  route_id INT REFERENCES routes(id),
  name VARCHAR(100) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  stop_order INT NOT NULL
);

-- Charging stations (reference only — simulation uses kku-routes.js CHARGERS)
CREATE TABLE chargers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  power_kw FLOAT DEFAULT 50.0,
  is_occupied BOOLEAN DEFAULT false
);

-- Buses (used by /energy endpoint JOIN with energy_logs)
CREATE TABLE buses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  route_id INT REFERENCES routes(id),
  battery_kwh FLOAT DEFAULT 150.0,
  battery_max_kwh FLOAT DEFAULT 150.0,
  status VARCHAR(20) DEFAULT 'running',
  passengers INT DEFAULT 0,
  total_km FLOAT DEFAULT 0.0,
  total_kwh_used FLOAT DEFAULT 0.0
);

-- Position log (written by simulation every 30 ticks ≈ 15 min sim-time)
CREATE TABLE bus_positions (
  id SERIAL PRIMARY KEY,
  bus_id INT REFERENCES buses(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  battery_pct FLOAT,
  speed_kmh FLOAT,
  passengers INT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Energy consumption log (written by simulation every 30 ticks)
CREATE TABLE energy_logs (
  id SERIAL PRIMARY KEY,
  bus_id INT REFERENCES buses(id),
  kwh_used FLOAT NOT NULL,
  km_traveled FLOAT NOT NULL,
  kwh_per_km FLOAT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Charging sessions
CREATE TABLE charging_sessions (
  id SERIAL PRIMARY KEY,
  bus_id INT REFERENCES buses(id),
  charger_id INT REFERENCES chargers(id),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  kwh_charged FLOAT DEFAULT 0.0,
  battery_start_pct FLOAT,
  battery_end_pct FLOAT
);

-- Indexes for performance
CREATE INDEX idx_bus_positions_bus_id ON bus_positions(bus_id);
CREATE INDEX idx_bus_positions_recorded_at ON bus_positions(recorded_at);
CREATE INDEX idx_energy_logs_bus_id ON energy_logs(bus_id);
