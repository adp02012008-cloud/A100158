import mongoose from "mongoose";

/**
 * Connects to MongoDB using Mongoose.
 * Uses environment variable MONGODB_URI.
 */
export async function connectDB(customUri) {
  const uri = customUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugslayers";

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
