const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server-Sent Events (SSE) clients for real-time dashboard updates
let sseClients = [];

// Initialize simple database
function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      bins: [
        {
          id: "bin_001",
          name: "Central Park Main Gate",
          fillPercentage: 0.0,
          batteryVoltage: 4.20,
          lidOpenCount: 0,
          lastEmptied: new Date().toISOString(),
          status: "Normal", // Normal, Warning, Critical
          lat: 40.7829,
          lng: -73.9654
        }
      ],
      telemetryHistory: [],
      smsLogs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    console.log("[DB] Initialized db.json database file.");
  }
}

function readDatabase() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("[DB ERROR] Reading database failed:", err);
    return { bins: [], telemetryHistory: [], smsLogs: [] };
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[DB ERROR] Writing database failed:", err);
  }
}

// Broadcast updates to all open web dashboards
function broadcastUpdate(type, payload) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// ==========================================
// API ENDPOINTS
// ==========================================

// SSE subscription endpoint for real-time UI
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  sseClients.push(res);
  console.log(`[SSE] Dashboard client connected. Total clients: ${sseClients.length}`);
  
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    console.log(`[SSE] Dashboard client disconnected. Total clients: ${sseClients.length}`);
  });
});

// Telemetry ingestion (called by SIM800L or IoT Simulator)
app.post('/api/telemetry', (req, res) => {
  const { binId, fillPercentage, batteryVoltage, lidOpenCount } = req.body;
  
  if (!binId || fillPercentage === undefined || batteryVoltage === undefined) {
    return res.status(400).json({ error: "Missing required telemetry fields." });
  }

  const db = readDatabase();
  let bin = db.bins.find(b => b.id === binId);
  
  if (!bin) {
    // Dynamically add bin if it's new
    bin = {
      id: binId,
      name: `Smart Bin ${binId}`,
      fillPercentage: 0.0,
      batteryVoltage: 4.20,
      lidOpenCount: 0,
      lastEmptied: new Date().toISOString(),
      status: "Normal",
      lat: 40.78 + (Math.random() - 0.5) * 0.01,
      lng: -73.96 + (Math.random() - 0.5) * 0.01
    };
    db.bins.push(bin);
  }

  // Update bin values
  bin.fillPercentage = parseFloat(fillPercentage);
  bin.batteryVoltage = parseFloat(batteryVoltage);
  if (lidOpenCount !== undefined) {
    bin.lidOpenCount = parseInt(lidOpenCount);
  }

  // Calculate status
  if (bin.fillPercentage >= 95.0) {
    bin.status = "Critical";
  } else if (bin.fillPercentage >= 80.0) {
    bin.status = "Warning";
  } else {
    bin.status = "Normal";
  }

  // Append history log
  const newLog = {
    binId: bin.id,
    fillPercentage: bin.fillPercentage,
    batteryVoltage: bin.batteryVoltage,
    lidOpenCount: bin.lidOpenCount,
    status: bin.status,
    timestamp: new Date().toISOString()
  };
  
  db.telemetryHistory.push(newLog);
  
  // Keep history to last 100 entries to avoid bloating
  if (db.telemetryHistory.length > 100) {
    db.telemetryHistory.shift();
  }

  writeDatabase(db);
  
  // Broadcast telemetry payload to active dashboard clients
  broadcastUpdate('telemetry', newLog);
  broadcastUpdate('bin_status', bin);

  console.log(`[TELEMETRY] Received from ${binId}: Fill: ${fillPercentage}%, Battery: ${batteryVoltage}V, Lid Openings: ${lidOpenCount}`);
  res.json({ success: true, message: "Telemetry logged successfully." });
});

// Get current state of all bins
app.get('/api/bins', (req, res) => {
  const db = readDatabase();
  res.json(db.bins);
});

// Get historical telemetry logs for a bin
app.get('/api/bins/:id/history', (req, res) => {
  const db = readDatabase();
  const history = db.telemetryHistory
    .filter(log => log.binId === req.params.id)
    .slice(-30); // Return last 30 readings
  res.json(history);
});

// Empty a bin (simulated or manual staff action)
app.post('/api/bins/:id/empty', (req, res) => {
  const db = readDatabase();
  const bin = db.bins.find(b => b.id === req.params.id);
  
  if (!bin) {
    return res.status(404).json({ error: "Bin not found." });
  }

  bin.fillPercentage = 0.0;
  bin.lidOpenCount = 0;
  bin.status = "Normal";
  bin.lastEmptied = new Date().toISOString();

  // Log emptying event in history
  db.telemetryHistory.push({
    binId: bin.id,
    fillPercentage: 0.0,
    batteryVoltage: bin.batteryVoltage,
    lidOpenCount: 0,
    status: "Normal",
    timestamp: bin.lastEmptied,
    event: "Emptied"
  });

  writeDatabase(db);

  broadcastUpdate('bin_status', bin);
  broadcastUpdate('alert', { type: "system", text: `${bin.name} has been emptied.` });

  console.log(`[SYSTEM] Bin ${req.params.id} manually reset/emptied.`);
  res.json({ success: true, message: "Bin reset successfully." });
});

// Route for simulating SMS dispatch from the IoT Device
app.post('/api/simulator/sms', (req, res) => {
  const { binId, fillPercentage, message, phone } = req.body;
  const db = readDatabase();
  
  const smsEntry = {
    id: 'sms_' + Date.now(),
    binId,
    phone,
    fillPercentage,
    message,
    timestamp: new Date().toISOString()
  };
  
  db.smsLogs.push(smsEntry);
  writeDatabase(db);
  
  broadcastUpdate('sms', smsEntry);
  console.log(`[SMS OUTBOX] Sent to ${phone}: "${message}"`);
  res.json({ success: true });
});

// Start Server
initDatabase();
app.listen(PORT, () => {
  console.log(`[SERVER] Backend server running at http://localhost:${PORT}`);
});
