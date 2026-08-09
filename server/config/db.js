import mongoose from "mongoose";
import dns from "dns";

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
    if (error.code === 'ECONNREFUSED' || (error.message && (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')))) {
      console.warn("Local DNS failed SRV lookup, switching DNS resolver to 8.8.8.8 and retrying...");
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected (via fallback DNS): ${conn.connection.host} [Database: ${conn.connection.name}]`);
        return conn;
      } catch (retryError) {
        console.error("MongoDB Connection Error:", retryError.message);
        throw retryError;
      }
    }
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  console.log("MongoDB Disconnected.");
}

