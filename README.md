# Smart IoT Dustbin – Waste Management System

[![Server Status](https://img.shields.io/badge/Server-Active-success?style=flat-square)](#)
[![Firmware](https://img.shields.io/badge/Firmware-Arduino--C%2B%2B-blue?style=flat-square)](#)
[![Mobile App](https://img.shields.io/badge/Mobile-React--Native-blueviolet?style=flat-square)](#)
[![Sustainability](https://img.shields.io/badge/Focus-Sustainability-green?style=flat-square)](#)

## 📖 Overview

The **Smart IoT Dustbin** is an end-to-end embedded + full-stack solution that modernizes urban waste collection. Traditional garbage collection relies on fixed schedules regardless of how full a bin actually is — leading to overflowing bins in high-traffic areas and wasted collection trips to near-empty ones. This system solves that by giving every bin a digital heartbeat.

An **ultrasonic sensor** continuously measures the fill level inside the bin, while an **IR sensor** detects hand/object proximity to automatically open the lid — enabling a touch-free, hygienic user experience. Once the fill level crosses a configurable threshold, the onboard **SIM800L GSM module** sends an **SMS alert** directly to the waste collection team, and periodically pushes structured telemetry (fill %, battery voltage, lid status) to a backend server over GPRS. The entire unit is powered by a **solar panel** with battery monitoring, making it viable for outdoor, off-grid deployment. A lightweight **mobile app** gives municipal staff a live dashboard of every bin's status, so collection routes can be planned based on actual need instead of guesswork.

---

## ✨ Key Features

- **Real-time fill-level monitoring** via ultrasonic distance sensing
- **Touch-free auto-lid** using IR obstacle detection + servo motor
- **GSM SMS alerts** at configurable warning/critical fill thresholds
- **GPRS telemetry** pushed to a REST backend for historical tracking
- **Solar-powered** with battery voltage monitoring and low-power warnings
- **Mobile dashboard** showing live fill %, battery health, and last-emptied time
- **Threshold-based alert cooldown** to prevent SMS spam
- **Built-in Web Simulator** to test GPRS telemetry, SMS warning triggers, and lid openings without connecting physical hardware!

---

## 🏗️ System Architecture

```
 ┌────────────┐      ┌─────────────┐      ┌───────────────┐      ┌────────────┐
 │ Ultrasonic │      │             │      │               │      │            │
 │ + IR Sensor├─────▶│  Arduino    ├─────▶│  SIM800L GSM  ├─────▶│  Backend   │
 │  (Bin Unit)│      │  (C/C++)    │      │ (SMS + GPRS)  │      │  (Node.js) │
 └────────────┘      └──────┬──────┘      └───────────────┘      └─────┬──────┘
        ▲                   │                                          │
        │             ┌─────┴──────┐                                   ▼
   Solar Panel ───────▶  Servo Lid │                            ┌────────────┐
   + Battery           └────────────┘                            │ Mobile App │
                                                                   │ (Live UI)  │
                                                                   └────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Embedded Firmware** | Arduino (C/C++) |
| **Sensing** | HC-SR04 Ultrasonic, IR Obstacle Sensor |
| **Connectivity** | SIM800L GSM/GPRS Module |
| **Power** | Solar Panel + Li-ion + Voltage Divider Monitor |
| **Backend Server** | Node.js, Express (with Server-Sent Events real-time sync) |
| **Mobile App** | React Native (Expo) — live status monitoring dashboard |
| **Local Testing** | Interactive HTML/CSS/JS Web Hardware Simulator |

---

## 📁 Repository Layout

```
Smart Dustbin/
├── firmware/
│   └── SmartDustbin/
│       ├── SmartDustbin.ino       # Main Arduino sketch (sensing, cellular, servo)
│       └── Config.h               # PIN numbers, server URL, APN, and phone configs
├── backend/
│   ├── server.js                  # Express API server for GPRS POSTs and telemetry logs
│   ├── package.json               # Backend Node dependency list
│   └── public/                    # Admin Dashboard & IoT Hardware Simulator panel
├── mobile/
│   ├── App.js                     # React Native dashboard view
│   ├── package.json               # Mobile configuration
│   └── README.md                  # Mobile installation instructions
├── docs/
│   ├── wiring.md                  # Schematic pin mapping & battery voltage dividers
│   └── setup.md                   # Complete local setup and running instructions
└── README.md                      # Master documentation
```

---

## 🚦 Quick Start

To test the system immediately on your local machine using the web simulator:

1. **Start the backend server:**
   ```bash
   cd backend
   npm install
   npm start
   ```
2. **Access the control console:**
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.
3. **Interact with the Simulator:**
   Adjust the sliders and click the **Wave Hand** button to see real-time GPRS uploads, simulated SMS notifications, and live cylinder filling states!

For physical hardware details, refer to the [Wiring Manual](docs/wiring.md) and [System Installation Guide](docs/setup.md).
