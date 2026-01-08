#pragma once
#include <Arduino.h>
#include <MFRC522_I2C.h>

class RfidReader {
public:
  explicit RfidReader(uint8_t i2cAddr, int8_t resetPin = -1);

  void begin();
  bool readUid(String& outUid, String& outPiccType);
  void halt();

private:
  MFRC522_I2C _mfrc;
  String uidToString();
};
