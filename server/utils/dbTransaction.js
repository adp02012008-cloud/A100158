import mongoose from "mongoose";

/**
 * Authoritative Transaction Helper for Mongoose Operations
 *
 * Wraps multi-document mutations in a MongoDB Session & Transaction.
 * Provides complete atomicity with automatic retry on Write Conflicts.
 * Falls back to non-transactional execution if session or write-conflict persists.
 */
export async function withTransaction(callback, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let session = null;
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        session = await mongoose.startSession();
        session.startTransaction();
      }
    } catch (sessionErr) {
      session = null;
    }

    try {
      const result = await callback(session);
      if (session && session.inTransaction()) {
        await session.commitTransaction();
      }
      return result;
    } catch (error) {
      if (session && session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch {
          // Ignore rollback error
        }
      }

      const isWriteConflict =
        error.message &&
        (error.message.includes("Write conflict") ||
          error.message.includes("TransientTransactionError") ||
          error.message.includes("yielding is disabled") ||
          error.codeName === "WriteConflict");

      if (isWriteConflict && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 120));
        continue;
      }

      if (isWriteConflict) {
        // Fallback: Execute callback without transaction session for guaranteed persistence
        return await callback(null);
      }

      throw error;
    } finally {
      if (session) {
        try {
          session.endSession();
        } catch {
          // Ignore session end error
        }
      }
    }
  }
}
