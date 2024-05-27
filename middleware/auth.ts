import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";

export interface AuthRequest extends Request {
  user?: any;
}

function removeBearerPrefix(token: any): any {
  return token.replace('Bearer ', '');
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Get token from header
  const bearerToken = req.header("x-auth-token");

  // Check if not token
  if (!bearerToken) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }
  
  const token = removeBearerPrefix(bearerToken);

  // Verify token
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    console.error("Something went wrong with the auth middleware", error);
    return res.status(401).json({ msg: "Token is not valid" });
  }
};
