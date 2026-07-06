// ==========================================================================
// SMART DUSTBIN FRONTEND CONTROLLER & IoT SIMULATOR LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const liveClock = document.getElementById('live-clock');
  const emptyBinBtn = document.getElementById('empty-bin-btn');
  const clearSerialBtn = document.getElementById('clear-serial-btn');
  
  // Dashboard indicators
  const binName = document.getElementById('bin-name');
  const binStatusBadge = document.getElementById('bin-status-badge');
  const wastePercentageText = document.getElementById('waste-percentage-text');
  const wasteFluidWave = document.getElementById('waste-fluid-wave');
  const visualLid = document.getElementById('visual-lid');
  const batteryVolts = document.getElementById('battery-volts');
  const batteryBarFill = document.getElementById('battery-bar-fill');
  const lidStateText = document.getElementById('lid-state-text');
  const lidOpenCountEl = document.getElementById('lid-open-count');
  const lastEmptiedTime = document.getElementById('last-emptied-time');
  
  // Simulator Controls
  const simFillSlider = document.getElementById('sim-fill-slider');
  const simFillVal = document.getElementById('sim-fill-val');
  const simVoltageSlider = document.getElementById('sim-voltage-slider');
  const simVoltageVal = document.getElementById('sim-voltage-val');
  const simIrBtn = document.getElementById('sim-ir-btn');
  const networkStatus = document.getElementById('network-status');
  const gprsStatus = document.getElementById('gprs-status');
  
  // Simulator Outputs
  const virtualSmsThread = document.getElementById('virtual-sms-thread');
  const serialOutput = document.getElementById('serial-output');

  // --- Configuration ---
  const BIN_ID = 'bin_001';
  let historyChart = null;
  let simulatedLidOpenCount = 0;
  let isSimulatingLid = false;
  let postTelemetryTimeout = null;

  // --- Initial Setup ---
  updateClock();
  setInterval(updateClock, 1000);
  initChart();
  loadInitialData();
  connectSSE();

  // --- Clock Event ---
  function updateClock() {
    const now = new Date();
    liveClock.textContent = now.toTimeString().split(' ')[0];
  }

  // --- Logger: Arduino Serial Console ---
  function logToSerial(message) {
    const timestamp = `[${new Date().toTimeString().split(' ')[0]}] `;
    serialOutput.textContent += `\n${timestamp}${message}`;
    serialOutput.scrollTop = serialOutput.scrollHeight;
  }

  clearSerialBtn.addEventListener('click', () => {
    serialOutput.textContent = '[SYSTEM] Console cleared.';
  });

  // --- Logger: Virtual Phone SMS ---
  function addVirtualSMS(message) {
    const bubble = document.createElement('div');
    bubble.className = 'sms-bubble sms-inbound';
    bubble.innerHTML = `<strong>Waste Alert:</strong><br>${message}`;
    
    // Add receive sound/vibrate effect placeholder
    virtualSmsThread.appendChild(bubble);
    virtualSmsThread.scrollTop = virtualSmsThread.scrollHeight;
  }

  // --- Load Initial Bin Config & History ---
  async function loadInitialData() {
    try {
      // 1. Get Bins Info
      const res = await fetch('/api/bins');
      const bins = await res.json();
      const bin = bins.find(b => b.id === BIN_ID);
      if (bin) {
        updateDashboardUI(bin);
        // Sync simulator sliders to current state
        simFillSlider.value = bin.fillPercentage;
        simFillVal.textContent = `${bin.fillPercentage}%`;
        simVoltageSlider.value = bin.batteryVoltage;
        simVoltageVal.textContent = `${bin.batteryVoltage.toFixed(2)} V`;
        simulatedLidOpenCount = bin.lidOpenCount;
      }

      // 2. Fetch history
      const historyRes = await fetch(`/api/bins/${BIN_ID}/history`);
      const historyData = await historyRes.json();
      updateChartData(historyData);
    } catch (err) {
      console.error("Error loading initial database:", err);
    }
  }

  // --- Initialize Chart.js ---
  function initChart() {
    const ctx = document.getElementById('fillHistoryChart').getContext('2d');
    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Fill Level (%)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 9 } }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });
  }

  function updateChartData(historyList) {
    if (!historyChart) return;
    const labels = historyList.map(log => {
      const date = new Date(log.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const dataset = historyList.map(log => log.fillPercentage);

    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = dataset;
    historyChart.update();
  }

  // --- Real-time Updates via Server-Sent Events (SSE) ---
  function connectSSE() {
    const eventSource = new EventSource('/api/events');
    
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'bin_status' && data.payload.id === BIN_ID) {
        updateDashboardUI(data.payload);
      } 
      else if (data.type === 'telemetry' && data.payload.binId === BIN_ID) {
        // Appending new point to chart
        if (historyChart) {
          const timeStr = new Date(data.payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          historyChart.data.labels.push(timeStr);
          historyChart.data.datasets[0].data.push(data.payload.fillPercentage);
          
          if (historyChart.data.labels.length > 20) {
            historyChart.data.labels.shift();
            historyChart.data.datasets[0].data.shift();
          }
          historyChart.update();
        }
      }
      else if (data.type === 'sms' && data.payload.binId === BIN_ID) {
        addVirtualSMS(data.payload.message);
      }
      else if (data.type === 'alert') {
        logToSerial(`[ALERT] ${data.payload.text}`);
      }
    });

    eventSource.onerror = (err) => {
      console.warn("SSE disconnected. Reconnecting in 3s...", err);
      document.getElementById('connection-badge').className = "badge badge-warning";
      document.getElementById('connection-text').textContent = "Sync Lost - Reconnecting";
      eventSource.close();
      setTimeout(connectSSE, 3000);
    };
  }

  // --- Dashboard UI Updater ---
  function updateDashboardUI(bin) {
    binName.textContent = bin.name;
    wastePercentageText.textContent = `${Math.round(bin.fillPercentage)}%`;
    wasteFluidWave.style.height = `${bin.fillPercentage}%`;
    
    // Smooth transition updates on colors
    let fillGradient = 'linear-gradient(to top, #059669, #10b981)'; // Emerald Green
    let statusClass = 'tag-normal';
    
    if (bin.fillPercentage >= 95) {
      fillGradient = 'linear-gradient(to top, #b91c1c, #ef4444)'; // Crimson Red
      statusClass = 'tag-critical';
    } else if (bin.fillPercentage >= 80) {
      fillGradient = 'linear-gradient(to top, #d97706, #f59e0b)'; // Amber Yellow
      statusClass = 'tag-warning';
    }
    
    wasteFluidWave.style.background = fillGradient;
    binStatusBadge.textContent = bin.status;
    binStatusBadge.className = `status-tag ${statusClass}`;
    
    // Battery Indicator
    batteryVolts.textContent = `${bin.batteryVoltage.toFixed(2)}V`;
    const batteryPercentage = Math.min(100, Math.max(0, ((bin.batteryVoltage - 3.4) / (4.2 - 3.4)) * 100));
    batteryBarFill.style.width = `${batteryPercentage}%`;
    
    if (bin.batteryVoltage < 3.5) {
      batteryBarFill.style.backgroundColor = '#ef4444'; // Red for critical battery
    } else if (bin.batteryVoltage < 3.7) {
      batteryBarFill.style.backgroundColor = '#f59e0b'; // Amber warning
    } else {
      batteryBarFill.style.backgroundColor = '#10b981'; // Healthy Emerald
    }

    lidOpenCountEl.textContent = bin.lidOpenCount;
    
    const emptiedDate = new Date(bin.lastEmptied);
    lastEmptiedTime.textContent = emptiedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${emptiedDate.toLocaleDateString()})`;
  }

  // ==========================================
  // HARDWARE SIMULATION ACTIONS
  // ==========================================

  // Post Simulated Telemetry from sliders/actions
  function sendSimulatedTelemetry(fill, volts) {
    const netStatus = networkStatus.value;
    const gprsLink = gprsStatus.value;

    if (netStatus === 'unregistered') {
      logToSerial(`[GSM] Error: SIM800L not registered to network. Telemetry skipped.`);
      return;
    }
    
    if (gprsLink === 'detached') {
      logToSerial(`[GSM] Error: GPRS context detached. Cannot send GPRS HTTP request.`);
      return;
    }

    // Print AT command logs
    logToSerial(`[MCU] Preparing telemetry: Fill: ${fill}%, Battery: ${volts}V`);
    logToSerial(`[GSM] AT+SAPBR=1,1 (Activating GPRS Context) -> OK`);
    logToSerial(`[GSM] AT+HTTPINIT (Initializing HTTP Client) -> OK`);
    logToSerial(`[GSM] AT+HTTPPARA="URL","http://localhost:3000/api/telemetry" -> OK`);
    
    const payload = JSON.stringify({
      binId: BIN_ID,
      fillPercentage: fill,
      batteryVoltage: volts,
      lidOpenCount: simulatedLidOpenCount
    });

    logToSerial(`[GSM] AT+HTTPDATA=${payload.length},10000 (Uploading data...)`);
    logToSerial(`[GSM] payload: ${payload}`);
    
    // Simulate latency of GPRS POST request
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    })
    .then(res => res.json())
    .then(data => {
      logToSerial(`[GSM] AT+HTTPACTION=1 (POST Request sent)`);
      logToSerial(`[GSM] +HTTPACTION: 1,200,${JSON.stringify(data).length}`);
      logToSerial(`[GSM] AT+HTTPTERM (Closing client session) -> OK`);
      
      // SMS Alert Checking Simulation in Firmware
      checkFirmwareSMSAlerts(fill, volts);
    })
    .catch(err => {
      logToSerial(`[GSM] Error posting telemetry: Connection failed.`);
    });
  }

  // Trigger SMS alerting checks locally as the simulated Arduino firmware would
  function checkFirmwareSMSAlerts(fill, volts) {
    let message = "";
    
    // Warning SMS check
    if (fill >= 80 && fill < 95) {
      message = `WARNING: Smart Dustbin is ${fill}% full. Please schedule collection.`;
    } 
    // Critical SMS check
    else if (fill >= 95) {
      message = `CRITICAL: Smart Dustbin is ${fill}% full! Overflow imminent.`;
    }

    if (message) {
      logToSerial(`[MCU] Alert condition met! Dispatching SMS notification...`);
      logToSerial(`[GSM] AT+CMGF=1 (Set SMS Text Mode) -> OK`);
      logToSerial(`[GSM] AT+CMGS="+1234567890" (Setting Recipient) -> OK`);
      logToSerial(`[GSM] Sending Body: "${message}"`);
      logToSerial(`[GSM] Writing byte 26 (Ctrl+Z) -> Sent!`);
      logToSerial(`[GSM] +CMGS: Message dispatched successfully.`);

      // Post to SMS logger to show in virtual phone view
      fetch('/api/simulator/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binId: BIN_ID,
          fillPercentage: fill,
          message: message,
          phone: "+1234567890"
        })
      });
    }

    // Battery alert
    if (volts < 3.4) {
      logToSerial(`[MCU] BATTERY CRITICAL WARNING: ${volts}V! SMS warning triggered.`);
      fetch('/api/simulator/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          binId: BIN_ID,
          fillPercentage: fill,
          message: `LOW BATTERY ALERT: Voltage is ${volts}V. Check solar panel connection.`,
          phone: "+1234567890"
        })
      });
    }
  }

  // --- Throttle telemetry posting while sliding ---
  function queueTelemetryUpdate() {
    if (postTelemetryTimeout) clearTimeout(postTelemetryTimeout);
    
    postTelemetryTimeout = setTimeout(() => {
      const fill = parseFloat(simFillSlider.value);
      const volts = parseFloat(simVoltageSlider.value);
      sendSimulatedTelemetry(fill, volts);
    }, 400); // 400ms debounce window
  }

  // Slider events
  simFillSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    simFillVal.textContent = `${val}%`;
    queueTelemetryUpdate();
  });

  simVoltageSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(2);
    simVoltageVal.textContent = `${val} V`;
    queueTelemetryUpdate();
  });

  // --- Proximity Auto-Lid Simulation ---
  simIrBtn.addEventListener('click', () => {
    if (isSimulatingLid) return;
    
    isSimulatingLid = true;
    simIrBtn.disabled = true;
    simIrBtn.textContent = 'Lid Opening...';
    
    logToSerial(`[MCU] [IR DETECT] Proximity active. Triggering servo lid rotation.`);
    logToSerial(`[MCU] [SERVO] Rotating to 90 degrees (Lid Open).`);
    
    // Open lid UI state
    visualLid.classList.add('open');
    lidStateText.textContent = 'Open';
    lidStateText.className = 'metric-val text-open';
    
    simulatedLidOpenCount++;
    
    // Update local variables and push status
    const fill = parseFloat(simFillSlider.value);
    const volts = parseFloat(simVoltageSlider.value);
    sendSimulatedTelemetry(fill, volts);
    
    // Hold lid open for 5 seconds
    setTimeout(() => {
      logToSerial(`[MCU] [SERVO] Hold time elapsed. Rotating back to 0 degrees (Lid Closed).`);
      
      // Close lid UI state
      visualLid.classList.remove('open');
      lidStateText.textContent = 'Closed';
      lidStateText.className = 'metric-val text-closed';
      
      simIrBtn.disabled = false;
      simIrBtn.innerHTML = '<i class="fa-solid fa-hand"></i> Wave Hand';
      isSimulatingLid = false;
    }, 5000);
  });

  // --- Manual Empty / Collect Button ---
  emptyBinBtn.addEventListener('click', async () => {
    try {
      logToSerial(`[MCU] Simulating manual bin collection truck service...`);
      const res = await fetch(`/api/bins/${BIN_ID}/empty`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        logToSerial(`[MCU] Bin state reset confirmed. Fill: 0%, Open count: 0.`);
        // Reset slider selectors
        simFillSlider.value = 0;
        simFillVal.textContent = '0%';
        simulatedLidOpenCount = 0;
        
        // Push GPRS update reflecting new emptied state
        sendSimulatedTelemetry(0, parseFloat(simVoltageSlider.value));
      }
    } catch (err) {
      console.error("Error resetting bin:", err);
    }
  });

  // Dropdown listeners to reflect network state change in serial logs
  networkStatus.addEventListener('change', () => {
    const status = networkStatus.value;
    if (status === 'registered') {
      logToSerial(`[GSM] SIM800L Registered on Home Network (AT+CREG? -> 0,1)`);
    } else if (status === 'roaming') {
      logToSerial(`[GSM] SIM800L Registered on Roaming Network (AT+CREG? -> 0,5)`);
    } else {
      logToSerial(`[GSM] GSM Connection Lost. Searching for signal... (AT+CREG? -> 0,0)`);
    }
  });

  gprsStatus.addEventListener('change', () => {
    const status = gprsStatus.value;
    if (status === 'attached') {
      logToSerial(`[GSM] GPRS Service Context Opened (AT+SAPBR=1,1)`);
    } else {
      logToSerial(`[GSM] GPRS Service Context Closed/Deactivated (AT+SAPBR=0,1)`);
    }
  });

});
