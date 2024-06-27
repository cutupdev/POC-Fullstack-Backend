import { Request, Response, NextFunction } from "express";
import jwt, { decode } from "jsonwebtoken";
import User from "../model/UserModel";
import { errorLogger } from "../utils/logger";
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
  const bearerToken = req.header("Authorization");
  
    const token = removeBearerPrefix(bearerToken);

  // Check if not token
  if (!bearerToken) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    User.findOne({ email: decoded.user.email })
      .then((response) => {
        if(!response) {
          return res.status(400).json({ sucess: false, error: "User not found" });
        } else {
          req.user = decoded.user;
          next();
        }
      })
      .catch((error) => {
        return res.status(400).json({ sucess: false, error: "User not found" });
      })
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      errorLogger.error('Token has expired:', err.message, 'Expired at:', err.expiredAt);
      return res.status(401).json({ msg: "Token has expired" });
    } else if (err.name === 'JsonWebTokenError') {
      switch (err.message) {
        case 'jwt malformed':
          errorLogger.error('JWT is malformed:', err.message);
          return res.status(401).json({ msg: "JWT is malformed" });
          break;
        case 'invalid signature':
          errorLogger.error('Invalid signature:', err.message);
          return res.status(401).json({ msg: "Invalid signature" });
          break;
        case 'jwt signature is required':
          errorLogger.error('Signature is required:', err.message);
          return res.status(401).json({ msg: "jwt signature is required" });
          break;
        case 'invalid audience':
          errorLogger.error('Invalid audience:', err.message);
          return res.status(401).json({ msg: "Invalid audience" });
          break;
        case 'invalid issuer':
          errorLogger.error('Invalid issuer:', err.message);
          return res.status(401).json({ msg: "invalid issuer" });
          break;
        default:
          errorLogger.error('JWT error:', err.message);
          return res.status(401).json({ msg: "JWT error" });
      }
    } else if (err.name === 'NotBeforeError') {
      errorLogger.error('Token not active yet:', err.message, 'Not active until:', err.date);
      return res.status(401).json({ msg: "Token not active yet" });
    } else {
      errorLogger.error('Unknown token verification error:', err);
      return res.status(401).json({ msg: "Unknown token used" });
    }
  }
};
