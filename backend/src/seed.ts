import { hash } from 'argon2';

import { faker } from '@faker-js/faker';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

enum locationNames {
  Vaabenhuset = 'Vaabenhuset',
  Kirkeskibet = 'Kirkeskibet',
};

async function main() {
  try {
    /**
     * Generate test data for PostgreSQL
     */
    async function generatePSQL() {
      // Create Permission Groups if they don't exist
      const permissionGroups = [
        'Administrator',
        'Device',
        'Location',
        'Alert',
        'Data',
      ];
      for (const groupName of permissionGroups) {
        const exists = await prisma.permissionGroup.findFirst({
          where: { name: groupName },
        });
        if (!exists) {
          await prisma.permissionGroup.create({ data: { name: groupName } });
          console.info('Created permission group: ', groupName);
        }
      }

      // Create Permissions if they don't exist
      const permissions = [
        {
          code: 'administrator:users:view',
          group: 'Administrator',
          description: 'See users information',
        },
        {
          code: 'administrator:users:update',
          group: 'Administrator',
          description: 'Update users information',
        },
        {
          code: 'administrator:users:create',
          group: 'Administrator',
          description: 'Create new users',
        },
        {
          code: 'administrator:users:management',
          group: 'Administrator',
          description: 'Give user permissions',
        },
        {
          code: 'administrator:permission:create',
          group: 'Administrator',
          description: 'Create new permission',
        },
        {
          code: 'administrator:permission:view',
          group: 'Administrator',
          description: 'View permissions and their groups',
        },
        {
          code: 'administrator:permissiongroup:create',
          group: 'Administrator',
          description: 'Create new permission group',
        },
        {
          code: 'device:view',
          group: 'Device',
          description: 'View devices',
        },
        {
          code: 'device:create',
          group: 'Device',
          description: 'Create new devices',
        },
        {
          code: 'device:update',
          group: 'Device',
          description: 'Update device information',
        },
        {
          code: 'device:delete',
          group: 'Device',
          description: 'Delete device',
        },
        {
          code: 'location:view',
          group: 'Location',
          description: 'View location information',
        },
        {
          code: 'location:create',
          group: 'Location',
          description: 'Create new location',
        },
        {
          code: 'location:update',
          group: 'Location',
          description: 'Update location information',
        },
        {
          code: 'location:delete',
          group: 'Location',
          description: 'Delete location',
        },
        {
          code: 'alert:view',
          group: 'Alert',
          description: 'View alert information',
        },
        {
          code: 'alert:create',
          group: 'Alert',
          description: 'Create new alert',
        },
        {
          code: 'alert:update',
          group: 'Alert',
          description: 'Update alert information',
        },
        {
          code: 'data:view',
          group: 'Data',
          description: 'View data information',
        },
      ];

      for (const { code, group, description } of permissions) {
        const exists = await prisma.permission.findFirst({ where: { code } });
        if (!exists) {
          await prisma.permission.create({
            data: {
              code,
              description,
              permissionGroupId: await findPermissionGroup(group),
            },
          });
          console.info('Created permission: ', code);
        }
      }

      // Create Users if they don't exist
      const users = [
        {
          initials: 'AD',
          username: 'admin',
          password: await hash('admin'),
          name: 'Super Admin',
          email: 'admin@example.com',
        },
        {
          initials: 'TC',
          username: 'technician',
          password: await hash('technician'),
          name: 'Technician',
          email: 'technician@example.com',
        },
      ];

      for (const userData of users) {
        const exists = await prisma.user.findFirst({
          where: { username: userData.username },
        });
        if (!exists) {
          await prisma.user.create({ data: userData });
          console.info('Created user: ', userData.username);
        }
      }

      // Assign Permissions to Users
      const superAdminUser = await prisma.user.findFirst({
        where: { username: 'admin' },
      });
      const permissionTransaction = [];

      console.info('Assign permissions to users');
      if (superAdminUser) {
        const adminPermissions = await prisma.permission.findMany();
        for (const permission of adminPermissions) {
          const exists = await prisma.userPermissions.findFirst({
            where: {
              userId: superAdminUser.id,
              permissionId: permission.id,
            },
          });
          if (!exists) {
            permissionTransaction.push({
              userId: superAdminUser.id,
              assignedBy: superAdminUser.id,
              permissionId: permission.id,
            });
          }
        }

        // Assign Permissions to Technicians
        const technicianUser = await prisma.user.findFirst({
          where: { username: 'technician' },
        });

        const technicianPermissions = await prisma.permission.findMany({
          where: {
            PermissionGroup: { OR: [{ name: 'Device' }, { name: 'Data' }] },
          },
        });

        if (technicianUser) {
          for (const permission of technicianPermissions) {
            permissionTransaction.push({
              userId: technicianUser.id,
              assignedBy: superAdminUser.id,
              permissionId: permission.id,
            });
          }
        }

        await prisma.userPermissions.createMany({
          data: permissionTransaction,
        });
        console.info('Assigned permissions to users');
      }

      // Create Locations if they don't exist

      const locations = Object.values(locationNames).map(value => (value));
      console.info('Creating locations');
      for (const locationName of locations) {
        const exists = await prisma.location.findFirst({
          where: { name: locationName },
        });
        if (!exists) {
          await prisma.location.create({ data: { name: locationName } });
          console.info('Created location: ', locationName);
        }
      }

      // Create Devices if they don't exist
      const devices = [
        { name: 'Device 1', frequency: 120, location: locationNames.Vaabenhuset },
        { name: 'Device 2', frequency: 120, location: locationNames.Kirkeskibet },
      ];

      console.info('Creating devices');
      for (const device of devices) {
        const exists = await prisma.device.findFirst({
          where: { name: device.name },
        });
        if (!exists) {
          await prisma.device.create({
            data: {
              name: device.name,
              frequency: device.frequency,
              locationUuid: await findLocation(device.location),
            },
          });
          console.info('Created device: ', device.name);
        }
      }

      // Create Alerts if they don't exist
      const alerts = [
        {
          device: 'Device 1',
          type: $Enums.AlertType.ERROR,
          description: 'Temperature is too high',
          threshold: 30,
          identifier: $Enums.Identifier.CELSIUS,
          name: 'TEMPERATURE_TO_HIGH',
        },
        {
          device: 'Device 2',
          type: $Enums.AlertType.ERROR,
          description: 'Temperature is too low',
          threshold: 20,
          identifier: $Enums.Identifier.CELSIUS,
          name: 'TEMPERATURE_TO_LOW',
        },
      ];

      console.info('Creating alerts');
      for (const alert of alerts) {
        const exists = await prisma.alert.findFirst({
          where: { name: alert.name },
        });
        if (!exists) {
          await prisma.alert.create({
            data: {
              deviceId: await findDevice(alert.device),
              type: alert.type,
              description: alert.description,
              threshold: alert.threshold,
              identifier: alert.identifier,
              name: alert.name,
            },
          });
          console.info('Created alert: ', alert.name);
        }
      }

      // Create Data
      const timeseriesData: Prisma.TimeseriesCreateManyInput[] = [];

      console.log('Creating timeseries data');
      for (let index = 0; index < 20; index++) {
        if (Math.floor(Math.random() * 1) === 0) {
          timeseriesData.push({
            deviceId: await findDevice('Device 1'),
            value: faker.number.float({ max: 100 }),
            identifier: 'CELSIUS',
            locationId: await findLocation(locationNames.Vaabenhuset),
          });
        } else {
          timeseriesData.push({
            deviceId: await findDevice('Device 2'),
            value: faker.number.float({ max: 100 }),
            identifier: 'CELSIUS',
            locationId: await findLocation(locationNames.Kirkeskibet),
          });
        }
      }

      await prisma.timeseries.createMany({
        data: timeseriesData,
      });
      console.log(timeseriesData);
      console.log('Created timeseries data');
    }

    // Utility functions
    async function findDevice(name: string): Promise<string> {
      const result = await prisma.device.findFirst({ where: { name } });
      if (result) return result.uuid;
      throw new Error('Device not found');
    }

    async function findLocation(name: locationNames): Promise<string> {
      const result = await prisma.location.findFirst({ where: { name } });
      if (result) return result.uuid;
      throw new Error('Location not found');
    }

    async function findPermissionGroup(name: string): Promise<string> {
      const result = await prisma.permissionGroup.findFirst({
        where: { name },
        select: { id: true },
      });
      if (result) return result.id;
      throw new Error('Permission group not found');
    }

    await generatePSQL();
    console.log('Data generation completed successfully.');
  } catch (e) {
    console.error('Seeding failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
