/**
 * MongoDB Database Connection and Configuration
 *
 * This module handles the setup and configuration of the MongoDB database connection using the Mongoose library.
 * It also exports a function to establish the connection to the database and a constant for the application's port.
 */
import mongoose from "mongoose";
import { MONGO_URL } from "./config";
import { defaultLogger, authLogger, errorLogger, logLogger } from "../utils/logger";

/**
 * Establishes a connection to the MongoDB database.
 *
 * This function sets up a connection to the MongoDB database using the provided `MONGO_URL` configuration.
 * It enforces strict query mode for safer database operations. Upon successful connection, it logs the
 * host of the connected database. In case of connection error, it logs the error message and exits the process.
 */
export const connectMongoDB = async () => {
  let isConnected = false;

  const connect = async () => {
    try {
      if (MONGO_URL) {
        const connection = await mongoose.connect(MONGO_URL);
        logLogger.debug(`MONGODB CONNECTED : ${connection.connection.host}`);
        defaultLogger.debug(`MONGODB CONNECTED : ${connection.connection.host}`);
        isConnected = true;
      } else {
        logLogger.debug("No Mongo URL");
        defaultLogger.debug("No Mongo URL");
      }
    } catch (error) {
      errorLogger.error(`Error : ${(error as Error).message}`)
      isConnected = false;
      // Attempt to reconnect
      setTimeout(connect, 1000); // Retry connection after 1 seconds
    }
  };

  connect();

  mongoose.connection.on("disconnected", () => {
    logLogger.debug("MONGODB DISCONNECTED");
    defaultLogger.debug("MONGODB DISCONNECTED");
    isConnected = false;
    // Attempt to reconnect
    setTimeout(connect, 5000); // Retry connection after 5 seconds
  });

  mongoose.connection.on("reconnected", () => {
    logLogger.debug("MONGODB RECONNECTED");
    defaultLogger.debug("MONGODB RECONNECTED");
    isConnected = true;
  });
};
