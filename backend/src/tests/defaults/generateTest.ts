import { TestFunction, expect } from 'vitest';

import { APIResponse, Status } from '@api-types/general.types';

type ServiceFunction<T> = (...args: any[]) => Promise<APIResponse<T>>;

type IService<T = any> = Partial<{
  getAll: ServiceFunction<T[]>;
  create: ServiceFunction<T>;
  update: ServiceFunction<T>;
  deleteRecord: ServiceFunction<T>;
  softDeleteRecord: ServiceFunction<T>;
}>;

type FunctionWithArgs<T> = T extends (...args: infer P) => any
  ? (...args: P) => TestFunction
  : never;

type ITestCases<T extends IService> = {
  [K in keyof T as `${string & K}Test`]: FunctionWithArgs<T[K]>;
} & {
  cleanUp: () => void;
};

export default function createTestCases<T extends IService>(
  service: T,
  cleanupFunction: (id: string) => void = () => {},
): ITestCases<T> {
  const cleanupList: string[] = [];

  const testCases = {
    cleanUp() {
      cleanupList.map(cleanupFunction);
    },
  } as ITestCases<T>;

  if (service.getAll && typeof service.getAll === 'function') {
    testCases.getAllTest = ((...args): TestFunction => {
      return async () => {
        const response = await service.getAll!(...args);

        expect(response).toEqual({
          data: expect.arrayContaining([]),
          status: Status.Found,
          message: expect.any(String),
        });
      };
    }) as FunctionWithArgs<T['getAll']>;
  }

  if (service.create && typeof service.create === 'function') {
    testCases.createTest = ((...args): TestFunction => {
      return async () => {
        const response = await service.create!(...args);

        expect(response.status).toBe(Status.Created);
      };
    }) as FunctionWithArgs<T['create']>;
  }

  if (service.update && typeof service.update === 'function') {
    testCases.updateTest = ((...args): TestFunction => {
      return async () => {
        const response = await service.update!(...args);

        expect(response.status).toBe(Status.Updated);
      };
    }) as FunctionWithArgs<T['update']>;
  }

  if (service.deleteRecord && typeof service.deleteRecord === 'function') {
    testCases.deleteRecordTest = ((...args): TestFunction => {
      return async () => {
        const response = await service.deleteRecord!(...args);

        expect(response.status).toBe(Status.Deleted);
      };
    }) as FunctionWithArgs<T['deleteRecord']>;
  }

  if (
    service.softDeleteRecord &&
    typeof service.softDeleteRecord === 'function'
  ) {
    testCases.softDeleteRecordTest = ((...args): TestFunction => {
      return async () => {
        const response = await service.softDeleteRecord!(...args);

        expect(response.status).toBe(Status.Deleted);
      };
    }) as FunctionWithArgs<T['softDeleteRecord']>;
  }

  return testCases;
}
