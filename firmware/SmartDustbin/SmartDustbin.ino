#include <SoftwareSerial.h>
#include <Servo.h>
#include "Config.h"

// ==========================================
// GLOBALS & INSTANCES
// ==========================================
SoftwareSerial gsmSerial(GSM_RX_PIN, GSM_TX_PIN); // RX, TX
Servo lidServo;

// Lid control states
bool isLidOpen = false;
unsigned long lidOpenTime = 0;

// Telemetry & measurement timing
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 30000; // Push GPRS data every 30 seconds

// SMS Cooldown states
unsigned long lastWarningSMSTime = 0;
unsigned long lastCriticalSMSTime = 0;
bool warningAlertSent = false;
bool criticalAlertSent = false;

// Statistics
unsigned int lidOpenCount = 0;

// ==========================================
// SYSTEM INITIALIZATION
// ==========================================
void setup() {
  Serial.begin(9600);
  gsmSerial.begin(GSM_BAUD_RATE);
  
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);
  pinMode(IR_PROXIMITY_PIN, INPUT);
  
  // Attach servo and set to closed position
  lidServo.attach(SERVO_PIN);
  lidServo.write(LID_CLOSE_ANGLE);
  
  Serial.println(F("[SYSTEM] Smart IoT Dustbin Starting..."));
  
  // Initialize SIM800L
  initGSM();
}

// ==========================================
// MAIN PROGRAM LOOP
// ==========================================
void loop() {
  // 1. Handle auto-lid trigger (non-blocking)
  handleAutoLid();
  
  // 2. Periodically send GPRS telemetry and manage SMS alerts
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;
    
    // Read Sensors
    float fillPercentage = measureFillPercentage();
    float batteryVoltage = readBatteryVoltage();
    
    Serial.print(F("[INFO] Fill Level: "));
    Serial.print(fillPercentage);
    Serial.print(F("%, Battery: "));
    Serial.print(batteryVoltage);
    Serial.println(F("V"));
    
    // Check SMS Alerts
    checkAlertThresholds(fillPercentage, batteryVoltage);
    
    // Push GPRS Telemetry
    sendGPRSTelemetry(fillPercentage, batteryVoltage);
  }
}

// ==========================================
// AUTO-LID SUBSYSTEM (IR + SERVO)
// ==========================================
void handleAutoLid() {
  // Read IR sensor. Active Low is common (LOW = obstacle detected)
  int irState = digitalRead(IR_PROXIMITY_PIN);
  unsigned long currentMillis = millis();
  
  if (irState == LOW && !isLidOpen) {
    Serial.println(F("[LID] Proximity detected. Opening lid."));
    lidServo.write(LID_OPEN_ANGLE);
    isLidOpen = true;
    lidOpenTime = currentMillis;
    lidOpenCount++;
  }
  
  // Close the lid after LID_HOLD_TIME_MS has elapsed
  if (isLidOpen && (currentMillis - lidOpenTime >= LID_HOLD_TIME_MS)) {
    Serial.println(F("[LID] Hold time elapsed. Closing lid."));
    lidServo.write(LID_CLOSE_ANGLE);
    isLidOpen = false;
  }
}

// ==========================================
// SENSOR MEASUREMENTS
// ==========================================
float measureFillPercentage() {
  long totalDuration = 0;
  int sampleCount = 5;
  int validSamples = 0;
  
  for (int i = 0; i < sampleCount; i++) {
    digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
    
    long duration = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, 30000); // 30ms timeout
    if (duration > 0) {
      totalDuration += duration;
      validSamples++;
    }
    delay(10);
  }
  
  if (validSamples == 0) return 0.0; // Return empty if error
  
  float avgDuration = (float)totalDuration / validSamples;
  // Speed of sound: 343 m/s -> 0.0343 cm/microsecond. Divide by 2 for round trip.
  float distanceCm = avgDuration * 0.01715;
  
  // Clamp distance between 0 and BIN_HEIGHT_CM
  if (distanceCm > BIN_HEIGHT_CM) distanceCm = BIN_HEIGHT_CM;
  if (distanceCm < 0) distanceCm = 0;
  
  // Calculate percentage (closer means more full)
  float fillPercent = ((BIN_HEIGHT_CM - distanceCm) / BIN_HEIGHT_CM) * 100.0;
  return fillPercent;
}

float readBatteryVoltage() {
  int rawADC = analogRead(BATTERY_ADC_PIN);
  // Convert analog reading to ADC pin voltage
  float pinVoltage = rawADC * (ADC_REF_VOLTAGE / 1023.0);
  // Calculate actual battery voltage using divider formula: Vpin = Vbat * R2 / (R1 + R2)
  float batteryVoltage = pinVoltage * ((R1_RESISTOR_OHM + R2_RESISTOR_OHM) / R2_RESISTOR_OHM);
  return batteryVoltage;
}

// ==========================================
// GSM & ALERTS SUBSYSTEM
// ==========================================
void initGSM() {
  Serial.println(F("[GSM] Initializing SIM800L..."));
  delay(1000);
  
  // Send simple AT test commands
  sendATCommand("AT", "OK", 2000);
  sendATCommand("AT+CFUN=1", "OK", 2000); // Set full functionality
  sendATCommand("AT+CPIN?", "READY", 2000); // Check SIM status
  sendATCommand("AT+CREG?", "0,1", 2000); // Check network registration (1 = home, 5 = roaming)
}

void checkAlertThresholds(float fillPercent, float batVoltage) {
  unsigned long currentMillis = millis();
  unsigned long cooldownMs = (unsigned long)COOLDOWN_MINUTES * 60000;
  
  // Warning alert trigger
  if (fillPercent >= FILL_THRESHOLD_WARNING && fillPercent < FILL_THRESHOLD_CRITICAL) {
    if (!warningAlertSent || (currentMillis - lastWarningSMSTime >= cooldownMs)) {
      char msg[60];
      snprintf(msg, sizeof(msg), "WARNING: Smart Dustbin is %.1f%% full. Please schedule collection.", fillPercent);
      sendSMS(RECIPIENT_PHONE, msg);
      warningAlertSent = true;
      lastWarningSMSTime = currentMillis;
    }
  } 
  // Critical alert trigger
  else if (fillPercent >= FILL_THRESHOLD_CRITICAL) {
    if (!criticalAlertSent || (currentMillis - lastCriticalSMSTime >= cooldownMs)) {
      char msg[60];
      snprintf(msg, sizeof(msg), "CRITICAL: Smart Dustbin is %.1f%% full! Overflow imminent.", fillPercent);
      sendSMS(RECIPIENT_PHONE, msg);
      criticalAlertSent = true;
      lastCriticalSMSTime = currentMillis;
    }
  }
  
  // Low battery alert
  if (batVoltage < BATTERY_LOW_VOLTAGE) {
    static bool batAlertSent = false;
    if (!batAlertSent) {
      char msg[60];
      snprintf(msg, sizeof(msg), "LOW BATTERY ALERT: Voltage is %.2fV. Check solar charger.", batVoltage);
      sendSMS(RECIPIENT_PHONE, msg);
      batAlertSent = true;
    }
  }
  
  // Reset alerts when emptied (falls below 40% fill)
  if (fillPercent < 40.0) {
    if (warningAlertSent || criticalAlertSent) {
      Serial.println(F("[ALERT] Bin has been emptied. Resetting alert flags."));
      warningAlertSent = false;
      criticalAlertSent = false;
    }
  }
}

void sendSMS(const char* number, const char* text) {
  Serial.print(F("[SMS] Sending SMS to "));
  Serial.println(number);
  
  if (sendATCommand("AT+CMGF=1", "OK", 2000)) { // Set text mode
    char cmd[32];
    snprintf(cmd, sizeof(cmd), "AT+CMGS=\"%s\"", number);
    gsmSerial.println(cmd);
    delay(500);
    gsmSerial.print(text);
    gsmSerial.write(26); // Send Ctrl+Z
    delay(5000); // Wait for response
    Serial.println(F("[SMS] SMS command dispatched."));
  }
}

void sendGPRSTelemetry(float fillPercent, float batVoltage) {
  Serial.println(F("[GPRS] Pushing telemetry to backend..."));
  
  // Open GPRS context
  sendATCommand("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK", 2000);
  char apnCmd[64];
  snprintf(apnCmd, sizeof(apnCmd), "AT+SAPBR=3,1,\"APN\",\"%s\"", GPRS_APN);
  sendATCommand(apnCmd, "OK", 2000);
  sendATCommand("AT+SAPBR=1,1", "OK", 4000); // Enable GPRS connection
  
  // Initialize HTTP Client
  if (sendATCommand("AT+HTTPINIT", "OK", 2000)) {
    sendATCommand("AT+HTTPPARA=\"CID\",1", "OK", 2000);
    
    char urlPara[128];
    snprintf(urlPara, sizeof(urlPara), "AT+HTTPPARA=\"URL\",\"%s\"", SERVER_URL);
    sendATCommand(urlPara, "OK", 2000);
    sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 2000);
    
    // Prepare JSON payload
    char payload[128];
    snprintf(payload, sizeof(payload), "{\"binId\":\"bin_001\",\"fillPercentage\":%.1f,\"batteryVoltage\":%.2f,\"lidOpenCount\":%d}", 
             fillPercent, batVoltage, lidOpenCount);
    
    char dataCmd[32];
    snprintf(dataCmd, sizeof(dataCmd), "AT+HTTPDATA=%d,10000", (int)strlen(payload));
    
    gsmSerial.println(dataCmd);
    delay(500);
    gsmSerial.print(payload);
    delay(1000); // Wait for data write timeout
    
    // Execute HTTP POST
    sendATCommand("AT+HTTPACTION=1", "OK", 5000); // POST action
    sendATCommand("AT+HTTPTERM", "OK", 2000); // Terminate http
  }
  
  // Close GPRS connection
  sendATCommand("AT+SAPBR=0,1", "OK", 2000);
}

// Helper to send AT command and check for expected string
bool sendATCommand(const char* cmd, const char* expected, unsigned long timeout) {
  gsmSerial.println(cmd);
  unsigned long start = millis();
  String response = "";
  
  while (millis() - start < timeout) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      response += c;
    }
    if (response.indexOf(expected) != -1) {
      return true;
    }
  }
  Serial.print(F("[AT DEBUG] command: "));
  Serial.print(cmd);
  Serial.print(F(" | response failed or timed out. Log: "));
  Serial.println(response);
  return false;
}
