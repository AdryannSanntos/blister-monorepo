import { disconnectTestDatabase } from './test-database';

afterAll(async () => {
  await disconnectTestDatabase();
});

jest.setTimeout(60000);
