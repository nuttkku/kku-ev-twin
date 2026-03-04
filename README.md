# KKU EV Bus Digital Twin — An Example for Transportation Digital Twin Development

> **Note:** This repository is published as an **example** for developers interested in applying Digital Twin concepts to transportation systems. The code shared here is **not the latest version used in the research** and has been simplified for illustrative purposes only.

---

## Abstract

The imperative for large institutions to decarbonize their operations necessitates a strategic shift from fossil-fuel-based transport to clean energy alternatives. This research addresses this transition at Khon Kaen University (KKU, approx. 8.8 km²) campus, implementing a 25-bus electric vehicle (EV) shuttle fleet under the KST EV contract (144.99M THB, June 2022 – May 2027). The primary benefit of this transition is the immediate elimination of tailpipe emissions e.g., CO₂, NOx, and PM2.5, significantly improving campus air quality and reducing the university's direct carbon footprint.

However, maximizing the benefits of electrification requires sophisticated management. This study presents the development of a **Digital Twin (DT)** framework to optimize the new EV fleet. The DT creates a high-fidelity virtual replica of the campus transit system, integrating real-time data including passenger demand, vehicle telemetry, and terrain elevation profiles. The system's objectives are twofold: enhancing service efficiency and minimizing the new energy footprint.

The DT utilizes a grade-aware battery consumption model with real SRTM30m elevation data (158–210 meters) and implements dynamic charging strategies through MQTT-based real-time monitoring. By simulating various operational and charging strategies, the system identifies optimal schedules to reduce overall kWh/km consumption, avoid peak electricity grid load, and maximize the use of clean energy sources. The architecture employs MapLibre GL for geospatial visualization, PostgreSQL for energy analytics, and an embedded Aedes MQTT broker for real-time communication.

Real operational data from the KST EV contract (39 months, June 2022 – August 2025) shows an average of 13,179 passengers/day with peaks reaching 19,600 passengers/day. The 25-bus fleet (Red: 7, Yellow: 7, Blue: 6, Green: 5) operates across 4 routes with headway-based dispatch (normal: 20 min, peak: 10 min). The digital twin simulation demonstrates a 30x fast-forward capability, enabling rapid scenario comparison and optimization of both route planning and charging schedules.

The primary environmental benefit is the **100% elimination of tailpipe emissions** (648 tonnes CO₂/year vs Diesel baseline), providing immediate campus air quality improvements. The digital twin's route optimizer uses a grade-aware energy model (SRTM30m terrain data) to minimize kWh consumption, demonstrating 6–8% energy savings compared to distance-optimized routes on KKU's hilly terrain. Combined with off-peak charging strategies (avoiding peak electricity rates), the system projects potential cost savings of ~3M THB/year.

By bridging the physical and digital worlds, this Digital Twin ensures the EV fleet delivers on its full potential, transforming campus mobility into a system that is both operationally superior and authentically sustainable, thereby offering a scalable model for institutional decarbonization.

**Keywords:** Digital Twins, Energy Footprint Optimization, Sustainable Campus Mobility, Electric Vehicle Fleet Management, Real-Time Monitoring, MQTT, Grade-Aware Battery Model

---

## Running the Simulation

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- Git

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/nuttkku/kku-ev-twin.git
cd kku-ev-twin
```

**2. Create the `.env` file**

```bash
cp .env.example .env
```

Open `.env` and update the PostgreSQL password as needed. The default values work out of the box for local testing.

```env
POSTGRES_DB=ev_twin
POSTGRES_USER=ev_user
POSTGRES_PASSWORD=change_me_strong_password
PORT=3000
MQTT_PORT=1883
TZ=Asia/Bangkok
```

**3. Build and start all services**

```bash
docker compose up -d --build
```

This starts 3 containers automatically:

| Container | Role | Port |
|---|---|---|
| `ev_postgres` | PostgreSQL database | 5432 |
| `ev_backend` | Node.js simulation engine + MQTT broker | 3000, 1883 |
| `ev_frontend` | Nginx static frontend | 8080 |

**4. Open in browser**

| Page | URL | Description |
|---|---|---|
| Green Line Simulator | http://localhost:8080 | Energy simulation with 3D terrain |
| Route Optimizer | http://localhost:8080/route-optimizer.html | Grade-aware TSP route optimization |

**5. Verify the simulation is running**

```bash
# Check backend and simulation status
curl http://localhost:3000/health

# Get real-time fleet statistics
curl http://localhost:3000/stats
```

Example response:
```json
{
  "simTime": "2025-08-01T08:30:00.000Z",
  "buses": { "total": 25, "running": 25, "charging": 0, "idle": 0 },
  "fleet": { "totalKm": 312, "totalKwh": 203, "avgKwhPerKm": 0.65, "avgBatteryPct": 74 },
  "co2SavedKg": 223
}
```

### Stop / Restart

```bash
# Stop all services
docker compose down

# Restart without rebuilding
docker compose up -d

# View logs
docker compose logs -f backend
```

### System Architecture

```
Frontend (Nginx :8080)
    │  sim-green.html — MapLibre GL + Socket.io
    │  route-optimizer.html — TSP + DEM elevation
    │
    ├─→ REST API  http://backend:3000
    └─→ WebSocket ws://backend:3000
              │
        Backend (Node.js :3000)
              │  Simulation Engine (30x fast-forward)
              │  Aedes MQTT Broker (:1883)
              │  Grade-aware energy model (SRTM30m)
              │
        PostgreSQL (:5432)
              │  energy_logs
              └─ bus_positions
```

---

*Wanut Padee, Passpun Jinota, Wanida Kanarkard — Faculty of Engineering, Khon Kaen University*
