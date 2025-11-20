import { MongoClient, Db } from 'mongodb';

type MongoCache = {
  client: MongoClient | null;
  db: Db | null;
};

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  console.warn('[MongoDB] MONGODB_URI is not defined; database features will be disabled.');
}

if (!dbName) {
  console.warn('[MongoDB] MONGODB_DB is not defined; database features will be disabled.');
}

const globalForMongo = globalThis as typeof globalThis & { _mongoCache?: MongoCache };

if (!globalForMongo._mongoCache) {
  globalForMongo._mongoCache = {
    client: null,
    db: null,
  };
}

export async function connectToDatabase() {
  if (!uri || !dbName) {
    throw new Error('Missing MongoDB credentials. Set MONGODB_URI and MONGODB_DB.');
  }

  if (globalForMongo._mongoCache?.client && globalForMongo._mongoCache?.db) {
    return {
      client: globalForMongo._mongoCache.client,
      db: globalForMongo._mongoCache.db,
    };
  }

  // Добавляем таймаут для подключения (10 секунд)
  const connectPromise = MongoClient.connect(uri);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
  });

  const client = await Promise.race([connectPromise, timeoutPromise]) as MongoClient;
  const db = client.db(dbName);

  globalForMongo._mongoCache = { client, db };

  return { client, db };
}

