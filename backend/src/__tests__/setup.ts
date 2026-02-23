process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters-long';
process.env.CLIENT_URL = 'http://localhost:3000';

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';

export default async () => {
  await connectDatabase();
};

