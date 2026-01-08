# Door Access Control Logging Implementation

## Overview
A complete logging system for the door access control has been implemented. All access attempts (successful and failed) are now recorded in a database table for audit trails and statistics.

## Changes Made

### 1. Database Schema (Prisma)
**File:** `backend/prisma/schema.prisma`

#### New Enum - `AccessStatus`
```typescript
enum AccessStatus {
  CORRECT_KEYCARD       // Valid keycard scanned
  INCORRECT_KEYCARD     // Invalid/inactive keycard scanned
  CORRECT_PASSWORD      // Password verification successful
  INCORRECT_PASSWORD    // Password verification failed
  SESSION_TIMEOUT       // Password entry timeout exceeded
  ACCESS_GRANTED        // Final access granted confirmation
  DOOR_UNLOCKED         // Door lock activated
}
```

#### New Model - `AccessLog`
Stores all access attempts with the following fields:
- `id` (UUID): Unique identifier
- `doorId` (UUID): Reference to the door
- `userKeycardId` (UUID, optional): Reference to the keycard user
- `keycardCode` (String, optional): RFID card code
- `accessStatus` (AccessStatus): Status of the access attempt
- `timestamp` (DateTime): When the access occurred (auto-set to now)
- `details` (String, optional): Additional context/error messages

**Relationships:**
- Links to `Door` model with cascade delete

### 2. Types
**File:** `backend/src/types/access.types.ts` (NEW)

```typescript
enum AccessStatus {
  CORRECT_KEYCARD = 'CORRECT_KEYCARD',
  INCORRECT_KEYCARD = 'INCORRECT_KEYCARD',
  CORRECT_PASSWORD = 'CORRECT_PASSWORD',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  DOOR_UNLOCKED = 'DOOR_UNLOCKED',
}

interface IAccessLogData {
  doorId: string;
  userKeycardId?: string;
  keycardCode?: string;
  accessStatus: AccessStatus;
  details?: string;
}

interface IAccessLog extends IAccessLogData {
  id: string;
  timestamp: Date;
}
```

### 3. Access Service
**File:** `backend/src/api/services/access.service.ts`

#### New Function: `logAccessAttempt()`
```typescript
export async function logAccessAttempt(data: IAccessLogData): Promise<void>
```

Creates a log entry in the database. Features:
- Handles all access status types
- Includes error handling (non-blocking - won't interrupt access flow)
- Logs descriptive details for debugging
- Async operation with proper error handling

#### Integrated Logging Points

The logging is called at these critical points:

1. **Invalid Keycard Scan**
   - Status: `INCORRECT_KEYCARD`
   - Includes: RFID code that failed, error details

2. **Valid Keycard Scan**
   - Status: `CORRECT_KEYCARD`
   - Includes: User keycard ID, RFID code

3. **Session Timeout**
   - Status: `SESSION_TIMEOUT`
   - Triggered when password not entered within timeout period

4. **Incorrect Password**
   - Status: `INCORRECT_PASSWORD`
   - Includes: User keycard ID, verification error details

5. **Correct Password**
   - Status: `CORRECT_PASSWORD`
   - Confirms password verification success

6. **Access Granted**
   - Status: `ACCESS_GRANTED`
   - Final confirmation of access

7. **Door Unlocked**
   - Status: `DOOR_UNLOCKED`
   - Door lock mechanism activated

## Usage

### Accessing Logs Programmatically
```typescript
import prisma from '@prisma-instance';

// Get all logs for a specific door
const doorLogs = await prisma.accessLog.findMany({
  where: { doorId: 'door-uuid' },
  orderBy: { timestamp: 'desc' },
});

// Get failed access attempts
const failedAttempts = await prisma.accessLog.findMany({
  where: {
    accessStatus: {
      in: ['INCORRECT_KEYCARD', 'INCORRECT_PASSWORD', 'SESSION_TIMEOUT'],
    },
  },
  orderBy: { timestamp: 'desc' },
});

// Get successful accesses
const successfulAccess = await prisma.accessLog.findMany({
  where: {
    accessStatus: 'ACCESS_GRANTED',
  },
  orderBy: { timestamp: 'desc' },
});

// Get logs for a specific user
const userLogs = await prisma.accessLog.findMany({
  where: { userKeycardId: 'keycard-uuid' },
  orderBy: { timestamp: 'desc' },
});

// Get logs within a date range
const recentLogs = await prisma.accessLog.findMany({
  where: {
    timestamp: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    },
  },
  orderBy: { timestamp: 'desc' },
});
```

## Database Migration

To apply these changes to your database:

```bash
cd backend
npx prisma migrate dev --name add-access-logs
```

This will:
1. Create the new `AccessLog` table
2. Add the `AccessStatus` enum
3. Update the `Door` relationship

## Benefits

✅ **Audit Trail**: Complete record of all access attempts
✅ **Security Monitoring**: Track failed attempts and patterns
✅ **User Accountability**: Know who accessed which doors and when
✅ **Debugging**: Detailed error information for troubleshooting
✅ **Statistics**: Analyze access patterns and usage
✅ **Non-Blocking**: Logging failures won't interrupt the access flow
✅ **Timestamped**: Automatic UTC timezone with PostgreSQL TIMESTAMPTZ

## Notes

- The `details` field is optional and stores error messages or additional context
- Logging is intentionally non-blocking to ensure access control isn't affected by database issues
- All timestamps use PostgreSQL's TIMESTAMPTZ for proper timezone handling
- The `userKeycardId` is optional for cases where access fails before user identification
