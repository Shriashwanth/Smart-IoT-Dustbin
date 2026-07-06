# 📱 Smart Dustbin - Mobile Dashboard App

This is a lightweight React Native application built with **Expo**, allowing waste management collection drivers and municipal operators to check the live fill status and battery health of smart bins while on the go.

## 🚀 Setup & Launch Instructions

### Prerequisites
1. Install **Node.js** (v16 or higher recommended).
2. Install **Expo Go** on your physical iOS or Android phone from the App Store / Play Store.

### 1. Install Dependencies
Navigate to this directory in your terminal and run:
```bash
npm install
```

### 2. Configure Backend Endpoint URL
Open [App.js](file:///c:/Users/Ashwanth/OneDrive/Documents/Smart%20Dustbin/mobile/App.js) and locate the `SERVER_IP` constant at the top of the file:
```javascript
const SERVER_IP = 'http://192.168.1.XX:3000'; // Replace XX with your local machine's network IP
```
> [!IMPORTANT]
> Change this IP from `localhost` to your computer's local network IP address (e.g., `192.168.1.50`). Both your phone and your computer must be connected to the **same Wi-Fi network** for the phone to communicate with the local Node.js backend.

### 3. Run the Development Server
Start the bundler by running:
```bash
npx expo start
```
This command starts Expo's Metro bundler and prints a large QR code in the terminal window.

### 4. Preview the App on Your Phone
- **Android**: Open the **Expo Go** app and tap **"Scan QR Code"** to scan the code displayed in your terminal.
- **iOS**: Open your phone's default **Camera App** and scan the QR code. Tap the pop-up link to open it in **Expo Go**.

The mobile dashboard will fetch and update its gauge metrics in real-time, syncing directly with either the physical IoT device or the web-based hardware simulator!
