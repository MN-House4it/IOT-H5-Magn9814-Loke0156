// prisma/seed.ts
import { PrismaClient, Status } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  // -----------------------------
  // Seed inputs (defined once)
  // -----------------------------
  const usersData = [
    {
      initials: "U1",
      name: "User One",
      email: "user1@example.com",
      username: "user1",
      plainPassword: "Password123!",
    },
    {
      initials: "U2",
      name: "User Two",
      email: "user2@example.com",
      username: "user2",
      plainPassword: "Password123!",
    },
  ] as const;

  const keycardsData = [
    { code: "E3:89:6E:AF", active: true },
    { code: "FE:79:D8:03", active: true },
  ] as const;

  const doorData = [
    {
      rfidDeviceId: "515351333120A8470F0F",
      keypadDeviceId: "515351333120484E411F",
      doorlockDeviceId: "304242375241C9033432",
      status: Status.ACTIVE,
    },
  ] as const;

  // -----------------------------
  // USERS
  // -----------------------------
  const userPasswordHashes = await Promise.all(
    usersData.map((u) => argon2.hash(u.plainPassword))
  );

  for (let i = 0; i < usersData.length; i++) {
    const u = usersData[i];
    const password = userPasswordHashes[i];

    await prisma.user.upsert({
      where: { username: u.username },
      update: {}, // don't rotate passwords on reseed
      create: {
        initials: u.initials,
        name: u.name,
        email: u.email,
        username: u.username,
        password,
      },
    });
  }

  // -----------------------------
  // KEYCARDS
  // -----------------------------
  for (const kc of keycardsData) {
    await prisma.keycard.upsert({
      where: { code: kc.code },
      update: { active: kc.active },
      create: kc,
    });
  }

  // -----------------------------
  // DOORS
  // -----------------------------
  // Using rfidDeviceId as the natural unique key
  await prisma.door.upsert({
    where: { rfidDeviceId: doorData[0].rfidDeviceId },
    update: {
      keypadDeviceId: doorData[0].keypadDeviceId,
      doorlockDeviceId: doorData[0].doorlockDeviceId,
      status: doorData[0].status,
    },
    create: doorData[0],
  });

  // -----------------------------
  // RELATIONS (UserKeycard + grants)
  // -----------------------------
  const users = await prisma.user.findMany({
    where: { username: { in: usersData.map((u) => u.username) } },
    orderBy: { username: "asc" },
  });

  const keycards = await prisma.keycard.findMany({
    where: { code: { in: keycardsData.map((k) => k.code) } },
    orderBy: { code: "asc" },
  });

  const door = await prisma.door.findUniqueOrThrow({
    where: { rfidDeviceId: doorData[0].rfidDeviceId },
  });

  // Seed a per-userKeycard password (argon2 hashed) (defined once)
  const userKeycardsSeed = [
    {
      userId: users[0].id,
      keycardId: keycards[0].id,
      plainPassword: "1234",
    },
    {
      userId: users[1].id,
      keycardId: keycards[1].id,
      plainPassword: "4321",
    },
  ] as const;

  const userKeycardPasswordHashes = await Promise.all(
    userKeycardsSeed.map((x) => argon2.hash(x.plainPassword))
  );

  for (let i = 0; i < userKeycardsSeed.length; i++) {
    const uk = userKeycardsSeed[i];
    const password = userKeycardPasswordHashes[i];

    await prisma.userKeycard.upsert({
      where: {
        userId_keycardId: { userId: uk.userId, keycardId: uk.keycardId },
      },
      update: {}, // keep stable on reseed
      create: {
        userId: uk.userId,
        keycardId: uk.keycardId,
        password,
      },
    });
  }

  const createdUserKeycards = await prisma.userKeycard.findMany({
    where: {
      OR: userKeycardsSeed.map((x) => ({
        userId: x.userId,
        keycardId: x.keycardId,
      })),
    },
  });

  // Grant both userKeycards access to the single door
  for (const uk of createdUserKeycards) {
    await prisma.userKeycardDoor.upsert({
      where: {
        userKeycardId_doorId: { userKeycardId: uk.id, doorId: door.id },
      },
      update: {},
      create: { userKeycardId: uk.id, doorId: door.id },
    });
  }

  console.log("✅ Seed complete (idempotent, argon2 hashed passwords)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
