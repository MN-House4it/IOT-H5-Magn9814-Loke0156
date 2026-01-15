#pragma once
#include <Arduino.h>
#include <MFRC522_I2C.h>

// RFID card/tag reader handler
class RfidReader
{
public:
  // Constructor - initialize with I2C address and optional reset pin
  explicit RfidReader(uint8_t i2cAddr, int8_t resetPin = -1);

  // Initialize the RFID reader module
  void begin();

  // Read RFID card UID and determine card type
  bool readUid(String &outUid, String &outPiccType);

  // Halt the current card and stop encryption
  void halt();

private:
  // MFRC522 I2C RFID reader module
  MFRC522_I2C _mfrc;

  // Convert UID bytes to formatted hexadecimal string
  String uidToString();
};
