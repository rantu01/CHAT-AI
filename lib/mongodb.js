import mongoose from "mongoose";
import ENV, { requireEnv } from "./env";

const globalForMongoose = globalThis;

if (!globalForMongoose.__rantuMongoose) {
  globalForMongoose.__rantuMongoose = {
    conn: null,
    promise: null,
  };
}

const cached = globalForMongoose.__rantuMongoose;

export async function connectMongo() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = requireEnv("MONGODB_URI", ENV.mongodbUri);
    const options = ENV.mongodbDbName ? { dbName: ENV.mongodbDbName } : {};

    cached.promise = mongoose.connect(uri, options).then((connection) => connection);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  cached.conn = null;
  cached.promise = null;
}