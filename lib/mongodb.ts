import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = { maxPoolSize: 10 };

let client: MongoClient;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri, options);
  }
  client = global._mongoClient;
} else {
  client = new MongoClient(uri, options);
}

export async function getDb(dbName = 'property_planner'): Promise<Db> {
  await client.connect();
  return client.db(dbName);
}
