import { MongoClient, Db } from 'mongodb';

const options = { maxPoolSize: 10 };

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

function getClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set.');

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri, options);
    }
    return global._mongoClient;
  }
  return new MongoClient(uri, options);
}

export async function getDb(dbName = 'property_planner'): Promise<Db> {
  const client = getClient();
  await client.connect();
  return client.db(dbName);
}
