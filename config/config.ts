import { errorLogger } from "../utils/logger";
import dotenv from "dotenv";
dotenv.config();

try {
  dotenv.config();
} catch (error) {
  errorLogger.error("Error loading environment variables:", error);
  process.exit(1);
}

// export const MONGO_URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;
export const MONGO_URL = process.env.DB_URL;
export const PORT = process.env.PORT || 5000
export const JWT_SECRET = process.env.JWT_SECRET || "JWT_SECRET";