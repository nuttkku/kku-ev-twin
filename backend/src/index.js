// Digital Twin EV Bus — Backend Server
// Pipeline: Simulation → MQTT (Aedes) → Socket.io → MapLibre GL
// Same approach as wunca46buu: embedded MQTT broker + GeoJSON REST API

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const aedes = require('aedes');
const net = require('net');
const { Pool } = require('pg');
const { SimulationEngine } = require('./simulation');

// ── Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const DATABASE_URL = process.env.DATABASE_URL;

// ── PostgreSQL ───────────────────────────────────────────────
const db = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : null;

if (db) {
  db.connect()
    .then(() => console.log('[DB] PostgreSQL connected'))
    .catch((e) => console.error('[DB] Connection error:', e.message));
}

// ── Aedes MQTT Broker (embedded — เหมือน wunca46buu) ────────
const broker = aedes();
const mqttServer = net.createServer(broker.handle);

mqttServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[MQTT] Port ${MQTT_PORT} already in use — skipping MQTT broker`);
  } else {
    console.error('[MQTT] Error:', err.message);
  }
});

mqttServer.listen(MQTT_PORT, () => {
  console.log(`[MQTT] Aedes broker listening on port ${MQTT_PORT}`);
});

broker.on('client', (client) => {
  console.log(`[MQTT] Client connected: ${client.id}`);
});

broker.on('publish', (packet) => {
  if (packet.topic.startsWith('ev/')) {
    // Forward MQTT → Socket.io (เหมือน wunca46buu pipeline)
    try {
      const data = JSON.parse(packet.payload.toString());
      io.emit('busUpdate', data);
    } catch (_) {}
  }
});

function mqttPublish(topic, payload) {
  broker.publish({ topic, payload: Buffer.from(payload), qos: 0, retain: true }, () => {});
}

// ── Express + Socket.io ──────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: { origin: '*' }
});

const path = require('path');

app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// ── Simulation Engine ────────────────────────────────────────
const sim = new SimulationEngine(db, mqttPublish);

// ── REST API Endpoints ───────────────────────────────────────

// GET /map — GeoJSON bus positions (เหมือน /map endpoint ใน wunca46buu)
app.get('/map', (req, res) => {
  res.json(sim.getGeoJSON());
});

// GET /routes — GeoJSON route lines
app.get('/routes', (req, res) => {
  res.json(sim.getRoutesGeoJSON());
});

// GET /chargers — GeoJSON charging stations
app.get('/chargers', (req, res) => {
  res.json(sim.getChargersGeoJSON());
});

// GET /stats — Fleet summary stats
app.get('/stats', (req, res) => {
  res.json(sim.getStats());
});

// GET /energy — Energy logs from PostgreSQL
app.get('/energy', async (req, res) => {
  if (!db) return res.json([]);
  try {
    const result = await db.query(
      `SELECT b.name, SUM(e.kwh_used) as total_kwh, SUM(e.km_traveled) as total_km,
              AVG(e.kwh_per_km) as avg_kwh_per_km, COUNT(*) as log_count
       FROM energy_logs e JOIN buses b ON e.bus_id = b.id
       GROUP BY b.name ORDER BY b.name`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /holiday — toggle holiday mode (12 buses = 3/route)
app.post('/holiday', (req, res) => {
  sim.isHoliday = !sim.isHoliday;
  res.json({ isHoliday: sim.isHoliday, message: sim.isHoliday ? 'Holiday mode ON (12 buses)' : 'Holiday mode OFF' });
});

// GET /bus-stops — All campus bus stop GeoJSON
app.get('/bus-stops', (req, res) => {
  const fs = require('fs');
  // In Docker: mounted at /app/bus_stop.geojson via docker-compose volume
  // Locally: two levels up from src/ to project root
  const candidates = [
    path.join(__dirname, '../bus_stop.geojson'),   // Docker: /app/bus_stop.geojson
    path.join(__dirname, '../../bus_stop.geojson'), // Local dev: project root
  ];
  const filePath = candidates.find(p => fs.existsSync(p));
  if (!filePath) {
    return res.status(404).json({ error: 'bus_stop.geojson not found' });
  }
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', simTime: sim.simTime, buses: sim.buses.length, isHoliday: sim.isHoliday });
});

// ── Socket.io ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('busUpdate', sim.getGeoJSON());
  socket.emit('stats', sim.getStats());

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Broadcast stats every 5 seconds
setInterval(() => {
  io.emit('stats', sim.getStats());
}, 5000);

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[API] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[API] Endpoints: /map /routes /chargers /stats /energy /health`);
  sim.start();
});
