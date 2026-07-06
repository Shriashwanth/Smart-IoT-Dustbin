#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// 1. PIN DEFINITIONS
// ==========================================
#define ULTRASONIC_TRIG_PIN   9    // HC-SR04 Trigger Pin
#define ULTRASONIC_ECHO_PIN   10   // HC-SR04 Echo Pin
#define IR_PROXIMITY_PIN      2    // IR Obstacle Sensor Output (Active Low)
#define SERVO_PIN             3    // PWM pin for the Lid Servo
#define BATTERY_ADC_PIN       A0   // Analog pin to read voltage divider
#define GSM_RX_PIN            7    // Arduino RX (Connects to SIM800L TX)
#define GSM_TX_PIN            8    // Arduino TX (Connects to SIM800L RX)

// ==========================================
// 2. SYSTEM CONSTANTS & THRESHOLDS
// ==========================================
#define BIN_HEIGHT_CM         50.0 // Full depth of the dustbin in centimeters
#define LID_OPEN_ANGLE        90   // Servo angle when lid is open (degrees)
#define LID_CLOSE_ANGLE       0    // Servo angle when lid is closed (degrees)
#define LID_HOLD_TIME_MS      5000 // How long the lid stays open (non-blocking)

// Thresholds for alerts (Percentage of bin filled)
#define FILL_THRESHOLD_WARNING  80  // Send SMS warning at 80% fill
#define FILL_THRESHOLD_CRITICAL 95  // Send SMS critical alert at 95% fill
#define COOLDOWN_MINUTES        30  // Prevent SMS spam by waiting 30 mins before re-alerting

// Voltage Divider configuration for Battery (e.g., 10k & 4.7k resistors)
#define R1_RESISTOR_OHM       10000.0
#define R2_RESISTOR_OHM       4700.0
#define ADC_REF_VOLTAGE       5.0   // 5V Arduino reference
#define BATTERY_LOW_VOLTAGE   3.4   // Threshold for low battery alert (V)

// ==========================================
// 3. GSM / GPRS SETTINGS
// ==========================================
#define GSM_BAUD_RATE         9600
#define GPRS_APN              "internet" // Replace with your SIM provider's APN
#define SERVER_URL            "http://your-server-ip:3000/api/telemetry"
#define RECIPIENT_PHONE       "+1234567890" // Replace with waste collection staff phone number

#endif // CONFIG_H
