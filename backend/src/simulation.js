// Simulation Engine — Digital Twin EV Bus KKU
// Real data: KST EV contract (25 buses, Jun 2022–), TOR EV3 64 specs
// Bus type: Low Entry EV mini bus (6100x2200x3000 mm, Li-ion, CCS2)
//
// Pipeline: Simulation Engine → MQTT publish → Socket.io → MapLibre GL
// (กระบวนการเดียวกับ wunca46buu: data source → MQTT → frontend)

const { ROUTES, CHARGERS, getActiveBusCount, calcDistance } = require('./kku-routes');
const { SUMMARY: KST_SUMMARY } = require('./kst-ev-data');

// ============================================================
// CONFIG — from TOR EV3 64 (27 Apr 2021) + KST EV contract data
// ============================================================
const CFG = {
  // TOR spec: Li-ion battery, range >= 100 km/charge
  // Mini bus (6.1m): ~150 kWh → range = 150/0.65 ≈ 230 km (well above 100 km min)
  BATTERY_MAX_KWH: 150,

  // Mini bus (6.1m) energy: more efficient than 12m bus
  // Typical 6m EV campus bus: 0.6-0.7 kWh/km
  KWH_PER_KM: 0.65,

  // TOR: CCS Type 2, OCPP, 0-100% within 2 hours
  // 150 kWh / 2h = 75 kW DC fast charge
  CHARGE_RATE_KW: 75,

  CHARGE_TO_PCT: 0.80,       // resume at 80% (battery health)
  LOW_BATTERY_PCT: 0.20,     // go charge at 20%

  // TOR: avg speed on route >= 30 km/h; campus with stops ~20 km/h
  BUS_SPEED_KMH: 20,

  TICK_MS: 1000,             // real-time: 1 tick = 1 second
  SIM_SECONDS_PER_TICK: 30,  // fast-forward 30x
  LOG_INTERVAL_TICKS: 30,    // log to DB every 30 ticks (= 15 min sim time)
  SERVICE_START_H: 6,        // 06:00 (TOR: >= 13 hrs/day)
  SERVICE_END_H: 22,         // 22:00

  // TOR specs
  PASSENGER_CAPACITY: 30,    // TOR: >= 30 persons per bus (seated >= 16)
  GRADE_ABILITY_PCT: 15,     // TOR: gradeability >= 15%
  MAX_SPEED_KMH: 60,         // TOR: max speed >= 60 km/h on flat road
  CHARGE_SIMULTANEOUS: 12,   // TOR: >= 12 buses charging simultaneously
};

// Passenger demand by hour — calibrated from real KST EV data
// Real avg: 13,179 pax/day (งวด 15-39 avg), peak 19,600 (งวด 34)
// Distributed across 16 service hours (06:00-22:00)
// Scaled to match real average: sum = ~13,200 pax/day
const AVG_DAILY_PAX = KST_SUMMARY.avgPaxPerDay; // from real contract data
const DEMAND_BY_HOUR = [
  0,    0,    0,    0,    0,    0,     // 00-05 (no service)
  250,  950, 1900, 1050,               // 06-09 (morning rush peak at 07-08)
  850,  700,  950,  850,               // 10-13 (midday moderate)
  1050, 1650, 1400,  950,              // 14-17 (afternoon rush peak at 15-16)
  700,  600,  500,  350,               // 18-21 (evening tapering)
  150,    0,                           // 22-23
]; // Sum: ~13,850 pax/day (slightly above avg to account for peak days)

// ============================================================
// BUS STATE
// ============================================================
class Bus {
  constructor({ id, name, routeId, startWpIdx, batteryPct, fleetIdx }) {
    this.id = id;
    this.name = name;
    this.routeId = routeId;
    this.route = ROUTES.find((r) => r.id === routeId);
    this.fleetIdx = fleetIdx; // 0-based index within route's fleet (for headway logic)

    // Position on route
    this.wpIdx = startWpIdx % (this.route.waypoints.length - 1);
    this.segProgress = Math.random(); // 0–1 within current segment

    // Get actual start position
    const wp = this.route.waypoints[this.wpIdx];
    this.lng = wp[0];
    this.lat = wp[1];

    // Energy
    this.batteryKwh = CFG.BATTERY_MAX_KWH * batteryPct;
    this.totalKm = 0;
    this.totalKwhUsed = 0;
    this.tripKm = 0;
    this.tripsCompleted = 0;

    // State
    this.status = 'running'; // running | charging | idle
    this.chargerId = null;
    this.passengers = 0;

    // Telemetry for logging
    this._kmSinceLog = 0;
    this._kwhSinceLog = 0;
  }

  get batteryPct() {
    return this.batteryKwh / CFG.BATTERY_MAX_KWH;
  }

  // Move bus along route for `simSeconds` of simulated time
  // Returns km traveled
  move(simSeconds) {
    if (this.status !== 'running') return 0;

    const speedKmPerSec = CFG.BUS_SPEED_KMH / 3600;
    let distLeft = speedKmPerSec * simSeconds;
    let distMoved = 0;

    const maxWp = this.route.waypoints.length - 1;
    let loopGuard = maxWp;
    while (distLeft > 0 && loopGuard-- > 0) {
      const seg = this.route.segmentDist[this.wpIdx];
      // Skip zero-distance / duplicate waypoints instead of stopping
      if (!seg || seg < 0.000001) {
        this.wpIdx = (this.wpIdx + 1) % maxWp;
        if (this.wpIdx === 0) this.tripsCompleted++;
        this.segProgress = 0;
        continue;
      }

      const segRemaining = seg * (1 - this.segProgress);

      if (distLeft >= segRemaining) {
        // Advance to next waypoint
        distLeft -= segRemaining;
        distMoved += segRemaining;
        this.wpIdx = (this.wpIdx + 1) % (this.route.waypoints.length - 1);
        this.segProgress = 0;

        // Count trip completion when wrapping back to start
        if (this.wpIdx === 0) {
          this.tripsCompleted++;
        }
      } else {
        this.segProgress += distLeft / seg;
        distMoved += distLeft;
        distLeft = 0;
      }
    }

    // Interpolate current position
    const wpA = this.route.waypoints[this.wpIdx];
    const wpB = this.route.waypoints[this.wpIdx + 1] || wpA;
    this.lng = wpA[0] + (wpB[0] - wpA[0]) * this.segProgress;
    this.lat = wpA[1] + (wpB[1] - wpA[1]) * this.segProgress;

    // Drain battery — adjusted for slope (grade-aware energy model)
    // Grade resistance: +5% energy per 1% uphill, regenerative braking downhill (−3%)
    const grade = this.route.segmentGrade[this.wpIdx] || 0;
    const gradeMultiplier = grade >= 0
      ? 1 + grade * 5          // uphill: more energy
      : 1 + grade * 3;         // downhill: regen braking recovers some energy
    const kwhUsed = distMoved * CFG.KWH_PER_KM * Math.max(0.3, gradeMultiplier);
    this.batteryKwh = Math.max(0, this.batteryKwh - kwhUsed);
    this.totalKm += distMoved;
    this.totalKwhUsed += kwhUsed;
    this.tripKm += distMoved;
    this._kmSinceLog += distMoved;
    this._kwhSinceLog += kwhUsed;

    return distMoved;
  }

  // Charge for simSeconds, returns kWh charged
  charge(simSeconds, charger) {
    if (this.batteryKwh >= CFG.BATTERY_MAX_KWH * CFG.CHARGE_TO_PCT) {
      this.status = 'running';
      this.chargerId = null;
      return 0;
    }
    const powerKw = charger ? charger.power_kw : CFG.CHARGE_RATE_KW;
    const kwhAdded = (powerKw * simSeconds) / 3600;
    this.batteryKwh = Math.min(CFG.BATTERY_MAX_KWH, this.batteryKwh + kwhAdded);
    return kwhAdded;
  }

  // Snap bus to nearest charger
  goToCharger(chargers) {
    let nearest = null;
    let minDist = Infinity;
    for (const c of chargers) {
      const d = calcDistance([this.lng, this.lat], [c.lng, c.lat]);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    if (nearest) {
      this.status = 'charging';
      this.chargerId = nearest.id;
      this.lng = nearest.lng;
      this.lat = nearest.lat;
    }
  }

  // GeoJSON Feature for /map endpoint (เหมือน wunca46buu)
  toGeoJSON(simHour) {
    const demand = DEMAND_BY_HOUR[Math.floor(simHour)] || 0;
    const routeCapacity = demand / (this.route.busCount || 1);
    this.passengers = Math.round(Math.min(CFG.PASSENGER_CAPACITY, Math.max(0, routeCapacity * (0.8 + Math.random() * 0.4))));

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [this.lng, this.lat] },
      properties: {
        id: this.id,
        name: this.name,
        route: this.route.name,
        routeColor: this.route.color,
        status: this.status,
        batteryPct: Math.round(this.batteryPct * 100),
        batteryKwh: Math.round(this.batteryKwh),
        passengers: this.passengers,
        totalKm: Math.round(this.totalKm),
        tripsCompleted: this.tripsCompleted,
        kwhPerKm: this.totalKm > 0 ? +(this.totalKwhUsed / this.totalKm).toFixed(2) : 0,
        chargerId: this.chargerId,
        // Elevation & grade (from real SRTM30m data)
        elevationM: (() => {
          const wpA = this.route.waypoints[this.wpIdx];
          const wpB = this.route.waypoints[this.wpIdx + 1] || wpA;
          const eA = wpA[2] || 0, eB = wpB[2] || 0;
          return Math.round(eA + (eB - eA) * this.segProgress);
        })(),
        gradePct: Math.round((this.route.segmentGrade[this.wpIdx] || 0) * 100 * 10) / 10,
      },
    };
  }
}

// ============================================================
// SIMULATION ENGINE
// ============================================================
class SimulationEngine {
  constructor(db, mqttPublish) {
    this.db = db;
    this.mqttPublish = mqttPublish;
    this.buses = [];
    this.chargers = CHARGERS;
    this.simTime = new Date();
    this.simTime.setHours(CFG.SERVICE_START_H, 0, 0, 0);
    this.tickCount = 0;
    this.running = false;
    this.isHoliday = false; // toggle via /holiday endpoint
    this._initBuses();
  }

  _initBuses() {
    let busId = 1;
    for (const route of ROUTES) {
      const shortName = route.nameTh ? route.nameTh.replace('สาย', '') : route.name.split(' ')[0];
      for (let i = 0; i < route.busCount; i++) {
        const startBatteryPct = 0.7 + Math.random() * 0.3;
        const startWpIdx = Math.floor((i / route.busCount) * (route.waypoints.length - 1));
        this.buses.push(
          new Bus({
            id: busId++,
            name: `${shortName}${String(i + 1).padStart(2, '0')}`,
            routeId: route.id,
            startWpIdx,
            batteryPct: startBatteryPct,
            fleetIdx: i,
          })
        );
      }
    }
    console.log(`[Sim] Initialized ${this.buses.length} buses across ${ROUTES.length} routes`);
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log('[Sim] Starting simulation...');
    this._tick();
  }

  stop() {
    this.running = false;
    if (this._timer) clearTimeout(this._timer);
  }

  _tick() {
    if (!this.running) return;

    const simSec = CFG.SIM_SECONDS_PER_TICK;
    this.simTime = new Date(this.simTime.getTime() + simSec * 1000);
    this.tickCount++;

    const simHour = this.simTime.getHours() + this.simTime.getMinutes() / 60;

    // Loop back to 06:00 when day ends — simulation runs 24/7 in cycles
    if (simHour >= CFG.SERVICE_END_H || simHour < CFG.SERVICE_START_H) {
      this.simTime.setHours(CFG.SERVICE_START_H, 0, 0, 0);
      for (const bus of this.buses) {
        bus.status = 'running';
        bus._kmSinceLog = 0;
        bus._kwhSinceLog = 0;
      }
    }

    // Determine headway-based active bus count per route
    // Normal: 20-min headway | Peak (7-9, 15-17): 10-min headway | Holiday: 3/route
    const activeCounts = {};
    for (const route of ROUTES) {
      activeCounts[route.id] = getActiveBusCount(route, simHour, this.isHoliday);
    }

    // Update each bus
    for (const bus of this.buses) {
      const activeCount = activeCounts[bus.routeId] || bus.route.busCount;
      const shouldBeActive = bus.fleetIdx < activeCount;

      if (!shouldBeActive) {
        // Stand-by bus: park at nearest charger if not already
        if (bus.status !== 'idle' && bus.status !== 'charging') {
          bus.status = 'idle';
        }
        continue;
      }

      if (bus.status === 'idle') {
        bus.status = 'running';
      }

      if (bus.status === 'charging') {
        const charger = this.chargers.find((c) => c.id === bus.chargerId);
        bus.charge(simSec, charger);
      } else if (bus.batteryPct <= CFG.LOW_BATTERY_PCT) {
        bus.goToCharger(this.chargers);
      } else {
        bus.move(simSec);
      }
    }

    // Build GeoJSON FeatureCollection (เหมือน /map endpoint ใน wunca46buu)
    const geojson = {
      type: 'FeatureCollection',
      features: this.buses.map((b) => b.toGeoJSON(simHour)),
    };

    // Publish via MQTT + broadcast to Socket.io clients
    this.mqttPublish('ev/buses/positions', JSON.stringify(geojson));

    // Log to DB every LOG_INTERVAL_TICKS
    if (this.tickCount % CFG.LOG_INTERVAL_TICKS === 0) {
      this._logToDB();
    }

    this._timer = setTimeout(() => this._tick(), CFG.TICK_MS);
  }

  async _logToDB() {
    if (!this.db) return;
    for (const bus of this.buses) {
      if (bus._kmSinceLog <= 0) continue;
      try {
        const kwh_per_km = bus._kmSinceLog > 0 ? bus._kwhSinceLog / bus._kmSinceLog : 0;
        await this.db.query(
          `INSERT INTO energy_logs (bus_id, kwh_used, km_traveled, kwh_per_km)
           VALUES ($1, $2, $3, $4)`,
          [bus.id, bus._kwhSinceLog, bus._kmSinceLog, kwh_per_km]
        );
        await this.db.query(
          `INSERT INTO bus_positions (bus_id, lat, lng, battery_pct, passengers)
           VALUES ($1, $2, $3, $4, $5)`,
          [bus.id, bus.lat, bus.lng, bus.batteryPct, bus.passengers]
        );
        bus._kmSinceLog = 0;
        bus._kwhSinceLog = 0;
      } catch (e) {
        console.error(`[Sim] DB log error bus ${bus.id} (${bus.name}): ${e.message}`);
      }
    }
  }

  // Return current GeoJSON snapshot (for REST /map endpoint)
  getGeoJSON() {
    const simHour = this.simTime.getHours() + this.simTime.getMinutes() / 60;
    return {
      type: 'FeatureCollection',
      simTime: this.simTime.toISOString(),
      features: this.buses.map((b) => b.toGeoJSON(simHour)),
    };
  }

  // Return route lines as GeoJSON (for map background)
  // Strip z=0 coordinates — explicit z:0 renders the line at sea level (underground)
  // when terrain is enabled; 2D coordinates drape on terrain surface automatically
  getRoutesGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: ROUTES.map((r) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: r.waypoints.map((wp) => [wp[0], wp[1]]),
        },
        properties: { id: r.id, name: r.name, color: r.color, kmPerTrip: r.kmPerTrip },
      })),
    };
  }

  // Return chargers as GeoJSON
  getChargersGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: this.chargers.map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: c,
      })),
    };
  }

  // Fleet summary stats
  getStats() {
    const simHour = this.simTime.getHours() + this.simTime.getMinutes() / 60;
    const inPeak = [{ start:7,end:9},{start:15,end:17}].some(p => simHour>=p.start && simHour<p.end);
    const running = this.buses.filter((b) => b.status === 'running').length;
    const charging = this.buses.filter((b) => b.status === 'charging').length;
    const idle = this.buses.filter((b) => b.status === 'idle').length;
    const totalKm = this.buses.reduce((s, b) => s + b.totalKm, 0);
    const totalKwh = this.buses.reduce((s, b) => s + b.totalKwhUsed, 0);
    const totalPassengers = this.buses.reduce((s, b) => s + b.passengers, 0);
    const avgBattery = this.buses.reduce((s, b) => s + b.batteryPct, 0) / this.buses.length;

    return {
      simTime: this.simTime.toISOString(),
      buses: { total: this.buses.length, running, charging, idle },
      fleet: {
        totalKm: Math.round(totalKm),
        totalKwh: Math.round(totalKwh),
        avgKwhPerKm: totalKm > 0 ? +(totalKwh / totalKm).toFixed(3) : 0,
        avgBatteryPct: Math.round(avgBattery * 100),
        currentPassengers: totalPassengers,
      },
      // CO2 savings vs NGV: NGV 2.75 kg CO2/m3, ~0.26 m3/km → 0.715 kg/km
      // Real KST EV: 13,179 pax/day avg → cost 6.11 THB/pax (vs NGV est ~8.59 THB/pax)
      co2SavedKg: Math.round(totalKm * 0.715),
      contractStats: {
        avgPaxPerDay: KST_SUMMARY.avgPaxPerDay,
        peakPaxPerDay: KST_SUMMARY.peakPaxPerDay,
        costPerPaxTHB: KST_SUMMARY.costPerPaxTHB,
        totalAccidents: KST_SUMMARY.totalAccidents,
      },
      headway: {
        mode: this.isHoliday ? 'holiday' : inPeak ? 'peak' : 'normal',
        intervalMin: this.isHoliday ? 20 : inPeak ? 10 : 20,
        isHoliday: this.isHoliday,
        isPeak: inPeak,
      },
    };
  }
}

module.exports = { SimulationEngine, ROUTES, CHARGERS };
