# 🔌 Smart IoT Dustbin - Electrical Wiring & Power Guide

This guide details the physical hardware wiring, pin allocations, and power configuration requirements for the Smart IoT Dustbin.

## 📦 Component Checklist

| Component Name | Description | Operating Voltage | Source / Hookup |
| --- | --- | --- | --- |
| **Arduino Uno / Nano** | Microcontroller unit processing logical firmware loops | 5V | Regulated DC from battery system |
| **SIM800L GSM Module** | Cellular transceiver (SMS + GPRS GPRS context) | **3.7V - 4.2V** (Highly sensitive) | Directly from Li-ion battery or Buck converter |
| **HC-SR04 Ultrasonic** | Measures garbage level/depth inside the bin | 5V | Arduino 5V pin |
| **SG90 Servo Motor** | Pulls/pushes trash lid mechanical hinges | 5V | Arduino 5V pin (or external 5V if jittery) |
| **IR Proximity Sensor** | Detects hand motion for touchless activation | 5V | Arduino 5V pin |
| **Solar Panel (6V/1W)** | Recharges Li-ion battery via charger module | 5V - 6V | Input of TP4056 Charger |
| **TP4056 Charger Module**| Manages Li-ion battery charging cycles safely | 5V | Solar Panel connected to input pads |
| **3.7V Li-ion Battery** | Power bank backing the microcontroller | 3.7V nominal | Connected to TP4056 BAT+/BAT- pads |

---

## ⚡ Power Supply Requirements (Crucial!)
> [!CAUTION]
> The **SIM800L module draws up to 2A bursts** when transmitting cell towers. Feeding it from the Arduino 5V/3.3V pins will cause the Arduino to crash, reset, or bootloop.
> **Solution**: Wire the SIM800L VCC pin directly to the 3.7V Li-ion battery (which easily supplies 2A spikes) or use an LM2596 Buck Converter set to **4.0V** powered from a beefier source.

---

## 🗺️ Pinout Diagram & Connections

Ensure all grounds (**GND**) are connected together (Common Ground Scheme).

```
   +-------------------------------------------------------------+
   |                       ARDUINO UNO                           |
   +-------------------------------------------------------------+
      |      |      |      |        |        |      |      |
     A0      D2     D3     D7       D8       D9    D10    5V/GND
      |      |      |      |        |        |      |      |
      |      |      |      |        |        |      |      +---> Sensors VCC/GND
      |      |      |      |        |        |      +----------> Echo Pin (HC-SR04)
      |      |      |      |        |        +-----------------> Trigger Pin (HC-SR04)
      |      |      |      |        +--------------------------> TX Pin (SIM800L)*
      |      |      |      +-----------------------------------> RX Pin (SIM800L)*
      |      |      +------------------------------------------> Signal Pin (Servo)
      |      +-------------------------------------------------> OUT Pin (IR Sensor)
      +-----------------------------+
                                    |
                            [Voltage Divider]
                                    |
                           Battery Positive (+)
```

### 1. SIM800L GSM Connections
- **VCC** -> Positive (+) terminal of Li-ion battery or 4V Buck Converter output.
- **GND** -> Common Ground.
- **SIM800L RX** -> Connected to **Arduino Pin 8** (TX). 
  - *Recommendation*: Use a voltage divider (1k & 2.2k resistors) to step down the Arduino's 5V TX signal to the 3.3V logic expected by SIM800L RX.
- **SIM800L TX** -> Connected to **Arduino Pin 7** (RX). (Direct connection is safe as Arduino reads 3.3V as HIGH).

### 2. Ultrasonic Sensor (HC-SR04)
- **VCC** -> Arduino 5V.
- **GND** -> Common Ground.
- **Trig** -> Arduino Pin 9.
- **Echo** -> Arduino Pin 10.

### 3. Proximity IR Sensor
- **VCC** -> Arduino 5V.
- **GND** -> Common Ground.
- **OUT** -> Arduino Pin 2.

### 4. Servo Motor (Lid Actuator)
- **VCC** -> Arduino 5V.
- **GND** -> Common Ground.
- **PWM Signal** -> Arduino Pin 3.

### 5. Battery Monitoring Voltage Divider (A0)
To measure battery levels safely on Arduino's 5V analog pin, connect a resistor network:
- **Resistor R1 (10kΩ)**: Connect from battery Positive (+) to Analog A0.
- **Resistor R2 (4.7kΩ)**: Connect from A0 to Ground (GND).

**Voltage divider formula:**
$$\text{Voltage on A0} = \text{Battery Voltage} \times \left(\frac{R2}{R1 + R2}\right) = \text{Battery Voltage} \times 0.3197$$
This lets us safely monitor battery levels up to **15.6V** (since $5V / 0.3197 = 15.64V$), well within the safe range for 3.7V - 4.2V Li-ion cells.
