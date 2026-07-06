# ⚙️ Smart IoT Dustbin - System Setup & Installation Guide

This guide contains step-by-step instructions for running the complete Smart Dustbin system locally.

---

## 🛠️ Step 1: Backend Server Deployment

First, let's launch the central telemetry server and interactive simulator UI.

1. Open your terminal application and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install the necessary node modules:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm start
   ```
4. Verify the server is running by opening a web browser and navigating to:
   **[http://localhost:3000](http://localhost:3000)**

You should see a dark-themed administration dashboard showing **Central Park Main Gate** bin and an interactive hardware simulator next to it.

---

## 💻 Step 2: Running the Web-Based Simulator (No-Hardware Test)

If you don't have the physical Arduino components wired up, you can perform full system verification inside your browser:
1. Open the browser dashboard at `http://localhost:3000`.
2. Move the **Waste Level Slider** on the right side. You will see:
   - The graphic dustbin fill level rise in real-time.
   - The virtual Serial Monitor print GPRS payload upload sequences.
   - If the slider crosses **80%**, a mock SMS alert warning will appear inside the smartphone mock.
   - If it crosses **95%**, a critical warning message will appear inside the phone thread.
3. Click the **Wave Hand** button. The simulator lid will slide open for 5 seconds and close, incrementing the lid open counter.
4. Drag the battery slider below **3.4V** to trigger a Low Battery SMS event.
5. Click **Empty Bin** in the dashboard to reset the fill level back to 0%.

---

## 🔌 Step 3: Arduino Firmware Configuration

When you are ready to compile and flash the physical hardware:

1. Open the [Arduino IDE](https://www.arduino.cc/en/software).
2. Open the main sketch: [SmartDustbin.ino](file:///c:/Users/Ashwanth/OneDrive/Documents/Smart%20Dustbin/firmware/SmartDustbin/SmartDustbin.ino).
3. Open [Config.h](file:///c:/Users/Ashwanth/OneDrive/Documents/Smart%20Dustbin/firmware/SmartDustbin/Config.h) to configure parameters:
   - **GPRS APN**: Match with your GSM SIM card network carrier (e.g., "fast.t-mobile.com").
   - **SERVER_URL**: Change `http://your-server-ip:3000/api/telemetry` to your computer's local network IP (e.g., `http://192.168.1.100:3000/api/telemetry`) or remote server host.
   - **RECIPIENT_PHONE**: Enter the telephone number to receive SMS updates.
4. Go to **Tools > Board** and select **Arduino Uno** (or your respective board).
5. Select the serial port under **Tools > Port**.
6. Click **Upload** (right arrow icon) to write the firmware to the Arduino.
7. Open **Tools > Serial Monitor** (9600 Baud) to view execution logs.

---

## 📱 Step 4: Mobile App Launch

Please refer to the detailed mobile application setup guidelines in [mobile/README.md](file:///c:/Users/Ashwanth/OneDrive/Documents/Smart%20Dustbin/mobile/README.md) to bundle the React Native UI to your phone using Expo Go.
