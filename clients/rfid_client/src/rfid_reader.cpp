#include "rfid_reader.h"
#include <Wire.h>

// Constructor - initialize RFID reader with I2C address and optional reset pin
RfidReader::RfidReader(uint8_t i2cAddr, int8_t resetPin)
: _mfrc(i2cAddr, resetPin)
{}

// Initialize the RFID reader module
void RfidReader::begin()
{
  _mfrc.PCD_Init();
}

// Attempt to read an RFID card/tag present in the field
bool RfidReader::readUid(String& outUid, String& outPiccType)
{
  // Check if a new card is present in the field
  if (!_mfrc.PICC_IsNewCardPresent()) return false;
  // Read the card serial number
  if (!_mfrc.PICC_ReadCardSerial()) return false;

  // Convert UID to formatted string
  outUid = uidToString();

  // Determine the card type and get its name
  byte piccType = _mfrc.PICC_GetType(_mfrc.uid.sak);
  outPiccType = _mfrc.PICC_GetTypeName(piccType);

  return true;
}

// Stop reading and halt the current card
void RfidReader::halt()
{
  // Send HALT command to the card
  _mfrc.PICC_HaltA();
  // Stop encryption and clean up
  _mfrc.PCD_StopCrypto1();
}

// Convert the RFID UID bytes to a formatted hexadecimal string
String RfidReader::uidToString()
{
  String s;
  // Iterate through each byte of the UID
  for (byte i = 0; i < _mfrc.uid.size; i++) {
    // Pad single-digit hex values with leading zero
    if (_mfrc.uid.uidByte[i] < 0x10) s += '0';
    // Append the byte as hexadecimal
    s += String(_mfrc.uid.uidByte[i], HEX);
    // Add colon separator between bytes (except after last byte)
    if (i + 1 < _mfrc.uid.size) s += ':';
  }
  // Convert the result to uppercase
  s.toUpperCase();
  return s;
}
