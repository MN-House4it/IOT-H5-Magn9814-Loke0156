#include <Arduino.h>
#include <Wire.h>
#include <MFRC522_I2C.h>

// M5Stack Unit RFID/RFID2 default I2C address is 0x28, reset pin not connected (-1)
MFRC522_I2C mfrc522(0x28, -1);

static void printUid()
{
  Serial.print("UID: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) Serial.print('0');
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    if (i + 1 < mfrc522.uid.size) Serial.print(':');
  }
  Serial.println();
}

void setup()
{
  Serial.begin(115200);

  while (!Serial) { delay(10); }

  Wire.begin();               // Uno: SDA/SCL are the I2C pins (also on A4/A5 on classic Uno)
  delay(50);

  mfrc522.PCD_Init();         // init reader over I2C
  Serial.println("M5Stack RFID2 (I2C) ready. Tap a card/tag...");
}

void loop()
{
  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(20);
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(20);
    return;
  }

  Serial.print("PICC type: ");
  Serial.println(mfrc522.PICC_GetTypeName(mfrc522.PICC_GetType(mfrc522.uid.sak)));

  printUid();

  // Halt PICC and stop encryption on PCD
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  delay(500);
}
