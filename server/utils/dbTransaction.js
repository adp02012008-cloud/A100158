import mongoose from "mongoose";

/**
 * Authoritative Transaction Helper for Mongoose Operations
 *
 * Wraps multi-document mutations in a MongoDB Session & Transaction.
 * Provides complete atomicity: COMMIT on clean success, ROLLBACK on any failure.
 * Handles standalone MongoDB fallback cleanly if replica set is not initialized.
 */
export async function withTransaction(callback) {
  let session = null;

  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
  } catch (sessionErr) {
    // Session fallback for standalone non-replica-set environments
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
      } catch (rollbackErr) {
        // Ignore secondary rollback errors
      }
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}
