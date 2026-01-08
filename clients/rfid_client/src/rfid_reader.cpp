#include "rfid_reader.h"
#include <Wire.h>

RfidReader::RfidReader(uint8_t i2cAddr, int8_t resetPin)
: _mfrc(i2cAddr, resetPin)
{}

void RfidReader::begin()
{
  _mfrc.PCD_Init();
}

bool RfidReader::readUid(String& outUid, String& outPiccType)
{
  if (!_mfrc.PICC_IsNewCardPresent()) return false;
  if (!_mfrc.PICC_ReadCardSerial()) return false;

  outUid = uidToString();

  byte piccType = _mfrc.PICC_GetType(_mfrc.uid.sak);
  outPiccType = _mfrc.PICC_GetTypeName(piccType);

  return true;
}

void RfidReader::halt()
{
  _mfrc.PICC_HaltA();
  _mfrc.PCD_StopCrypto1();
}

String RfidReader::uidToString()
{
  String s;
  for (byte i = 0; i < _mfrc.uid.size; i++) {
    if (_mfrc.uid.uidByte[i] < 0x10) s += '0';
    s += String(_mfrc.uid.uidByte[i], HEX);
    if (i + 1 < _mfrc.uid.size) s += ':';
  }
  s.toUpperCase();
  return s;
}
