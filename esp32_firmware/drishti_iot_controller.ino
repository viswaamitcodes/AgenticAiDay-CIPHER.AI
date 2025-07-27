
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// =================================================
// === 1. WIFI & FIREBASE CREDENTIALS =============
// =================================================
#define WIFI_SSID "Ruchi"
#define WIFI_PASSWORD "ruchi123"

// Firebase configuration
#define API_KEY "AIzaSyDYf0eoN3CrHjz5cCfvHZ0KsBYOAgqXhM8"
#define FIREBASE_PROJECT_ID "drishti-ai-security-platform"
#define DATABASE_URL "https://drishti-ai-security-platform-default-rtdb.firebaseio.com/"
#define USER_EMAIL "esp32@project.com"
#define USER_PASSWORD "password123"

// =================================================
// === 2. HARDWARE PIN DEFINITIONS =================
// =================================================
const int leds[] = {12, 13, 14, 15, 25, 26, 27, 32};
const int DRONE_LED_1 = leds[0];
const int DRONE_LED_2 = leds[1];
const int POLICE_LED_1 = leds[2];
const int POLICE_LED_2 = leds[3];
const int AMBULANCE_LED_1 = leds[4];
const int AMBULANCE_LED_2 = leds[5];
const int FIRE_LED_1 = leds[6];
const int FIRE_LED_2 = leds[7];

// Motor A pins
#define M1_IN1 16
#define M1_IN2 17
#define MOTOR_EN1 4

// Motor B pins
#define M2_IN1 18
#define M2_IN2 19
#define MOTOR_EN2 5

// =================================================
// === 3. GLOBAL STATE VARIABLES ===================
// =================================================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// *** THIS IS THE CORRECTED PATH ***
String databasePath = "/iot_status/global_command/status";
String currentStatus = "None";

unsigned long previousBlinkMillis = 0;
const long blinkInterval = 400;
bool ledState = LOW;

unsigned long previousReadMillis = 0;
const long readInterval = 2000;

bool signedIn = false;

// =================================================
// === 4. FORWARD DECLARATIONS =====================
// =================================================
void handleStatusChange(String newStatus);
void stopAllMotors();
void startAllMotors();
void clearAllLEDs();
void initializeFirebase();

// =================================================
// === 5. SETUP ====================================
// =================================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("=== ESP32 IoT Security Controller ===");

  // Hardware Initialization
  for (int i = 0; i < 8; i++) pinMode(leds[i], OUTPUT);
  pinMode(M1_IN1, OUTPUT); pinMode(M1_IN2, OUTPUT);
  pinMode(M2_IN1, OUTPUT); pinMode(M2_IN2, OUTPUT);
  pinMode(MOTOR_EN1, OUTPUT); pinMode(MOTOR_EN2, OUTPUT);
  stopAllMotors();
  clearAllLEDs();
  Serial.println("✅ Hardware Initialized.");

  // WiFi Connection
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n✅ WiFi connected!");

  // Firebase Initialization
  initializeFirebase();
}

// =================================================
// === 6. MAIN LOOP ================================
// =================================================
void loop() {
  unsigned long currentMillis = millis();

  // Periodically check Firebase for status updates
  if (Firebase.ready() && (currentMillis - previousReadMillis >= readInterval)) {
    previousReadMillis = currentMillis;
    Serial.print("📡 Checking Firebase... ");
    if (Firebase.RTDB.getString(&fbdo, databasePath)) {
      Serial.println("✅ Success");
      String newStatus = fbdo.to<String>();
      if (newStatus != currentStatus && newStatus.length() > 0) {
        handleStatusChange(newStatus);
      }
    } else {
      Serial.println("❌ FAILED: " + fbdo.errorReason());
    }
  }

  // Handle hardware blinking logic
  if (currentMillis - previousBlinkMillis >= blinkInterval) {
    previousBlinkMillis = currentMillis;
    ledState = !ledState;

    if (currentStatus == "Police") {
      digitalWrite(POLICE_LED_1, ledState);
      digitalWrite(POLICE_LED_2, !ledState);
    } else if (currentStatus == "Ambulance") {
      digitalWrite(AMBULANCE_LED_1, ledState);
      digitalWrite(AMBULANCE_LED_2, ledState);
    } else if (currentStatus == "Fire") {
      digitalWrite(FIRE_LED_1, ledState);
      digitalWrite(FIRE_LED_2, !ledState);
    }
  }
}

// =================================================
// === 7. HELPER FUNCTIONS ========================
// =================================================

void initializeFirebase() {
  Serial.println("🔧 Initializing Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void handleStatusChange(String newStatus) {
  Serial.printf("🔄 Status changed from '%s' to '%s'\n", currentStatus.c_str(), newStatus.c_str());
  currentStatus = newStatus;

  // Always reset hardware to a clean state first
  clearAllLEDs();
  stopAllMotors();

  if (currentStatus == "Drone") {
    Serial.println("🛸 Drone mode: Motors ON, 2 LEDs solid ON");
    startAllMotors();
    digitalWrite(DRONE_LED_1, HIGH);
    digitalWrite(DRONE_LED_2, HIGH);
  } else if (currentStatus == "Police") {
    Serial.println("🚨 Police mode: Blinking LEDs...");
    digitalWrite(POLICE_LED_1, HIGH); 
    digitalWrite(POLICE_LED_2, LOW);  
    ledState = HIGH;                 
  } else if (currentStatus == "Ambulance") {
    Serial.println("🚑 Ambulance mode: Blinking LEDs...");
    digitalWrite(AMBULANCE_LED_1, HIGH); 
    digitalWrite(AMBULANCE_LED_2, HIGH); 
    ledState = HIGH;
  } else if (currentStatus == "Fire") {
    Serial.println("🔥 Fire mode: Blinking LEDs...");
    digitalWrite(FIRE_LED_1, HIGH); 
    digitalWrite(FIRE_LED_2, LOW);
    ledState = HIGH;
  } else {
    Serial.println("✅ Idle mode. All systems off.");
  }
}

void startAllMotors() {
  digitalWrite(MOTOR_EN1, HIGH);
  digitalWrite(MOTOR_EN2, HIGH);
  digitalWrite(M1_IN1, HIGH);
  digitalWrite(M1_IN2, LOW);
  digitalWrite(M2_IN1, HIGH);
  digitalWrite(M2_IN2, LOW);
  Serial.println("🏃 Motors started");
}

void stopAllMotors() {
  digitalWrite(M1_IN1, LOW);
  digitalWrite(M1_IN2, LOW);
  digitalWrite(M2_IN1, LOW);
  digitalWrite(M2_IN2, LOW);
  digitalWrite(MOTOR_EN1, LOW);
  digitalWrite(MOTOR_EN2, LOW);
  Serial.println("🛑 Motors stopped");
}

void clearAllLEDs() {
  for (int i = 0; i < 8; i++) {
    digitalWrite(leds[i], LOW);
  }
}
