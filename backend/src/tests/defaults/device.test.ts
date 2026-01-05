import { describe, it } from 'vitest';

import prisma from '@prisma-instance';
import { Prisma } from '@prisma/client';
import {
  createSchema,
  searchParamsSchema,
  updateSchema,
} from '@schemas/device.schema';
import * as defaultService from '@services/default.service';

import createTestCases from './generateTest';

describe('Device', () => {
  const testCases = createTestCases(defaultService);
  const table: Lowercase<Prisma.ModelName> = 'device';

  describe('Get cases', async () => {
    it('should get all', testCases.getAllTest(table, searchParamsSchema));
  });

  describe('Create cases', async () => {
    const { uuid: locationUuid } = await prisma.location.findFirstOrThrow();

    const createBody = { name: 'Test', frequency: 10000, locationUuid };

    it('should create', testCases.createTest(table, createBody, createSchema));
  });

  describe('Update cases', async () => {
    const { uuid } = await prisma[table].findFirstOrThrow();
    const updateBody = [{ uuid, name: 'Updated' }];

    it(
      'should update',
      testCases.updateTest(table, uuid, updateBody, updateSchema),
    );
  });

  describe('Delete cases', async () => {
    const { uuid: locationUuid } = await prisma.location.findFirstOrThrow();

    const { uuid } = await prisma[table].create({
      data: { name: 'Temp', frequency: 10000, locationUuid },
    });

    it('should delete', testCases.deleteRecordTest(table, uuid, 'uuid'));
  });
});
