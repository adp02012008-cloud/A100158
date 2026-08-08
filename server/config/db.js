import mongoose from "mongoose";

/**
 * Connects to MongoDB using Mongoose.
 * Uses environment variable MONGODB_URI.
 */
export async function connectDB(customUri) {
  const uri = customUri || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host} [Database: ${conn.connection.name}]`);
    return conn;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log("MongoDB Disconnected.");
}
