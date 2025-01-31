import { Request, Response, Router } from "express";
import { check, validationResult } from "express-validator";
import { errorLogger, logLogger } from "../../utils/logger";
import File from "../../model/FileModel";
import dotenv from "dotenv";
import { AuthRequest, authMiddleware } from "../../middleware";

dotenv.config();

// Create a new instance of the Express Router
const FileRouter = Router();

// @route    POST api/files/newUpload
// @desc     Upload new data
// @access   Private
FileRouter.post(
  "/newUpload",
  check("filename", "Filename is required").notEmpty(),
  check("type", "File type is required").notEmpty(),
  check("size", "File size is required").notEmpty(),
  check("creatorName", "Creator name is required").notEmpty(),
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      const categories = ['Agreement', 'Contract', 'Statement of Work (SOW)', 'Invoice'];
      let index = Math.floor(Math.random() * 4)
      if (index === 4) {
        index = 3;
      }
      let confident = Math.floor(Math.random() * 50 + 50);

      const file = new File({
        filename: req.body.filename,
        type: req.body.type,
        size: req.body.size,
        date: req.body.date,
        creatorName: req.body.creatorName,
        // category: categories[index],
        classification: "Finished",
        confidence: confident,
      });

      try {
        let savedFile = await file.save();
        logLogger.debug('New file saved successfully, ', savedFile);
        return res.json({ success: true, newData: savedFile });
      } catch (error: any) {
        errorLogger.error('Error when saving new file, ', error);
        if (error.name === 'ValidationError') {
          return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
        } else if (error.name === 'MongoError' && error.code === 11000) {
          return res.status(409).json({ success: false, message: "Duplicate Key Error", details: error.message });
        } else if (error.name === 'MongoError') {
          return res.status(500).json({ success: false, message: "Database Error", details: error.message });
        } else {
          return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
        }
      }

    } catch (error: any) {
      errorLogger.error('Error when saving new file, ', error);

      // Check for validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
      }

      // Handle other types of errors (e.g., database connection issues)
      if (error.name === 'MongoError') {
        return res.status(500).json({ success: false, message: "Database Error", details: error.message });
      }

      // Catch-all for other errors
      return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
    }
  }
);

// @route    Get api/files/getFiles
// @desc     Get whole files
// @access   Private
FileRouter.get(
  "/getFiles",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      const fileList = await File.find().sort({ date: -1 });
      return res.json({ success: true, files: fileList });

    } catch (error: any) {
      errorLogger.error("Error when getting files, ", error);

      // Check for validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
      }

      // Handle other types of errors (e.g., database connection issues)
      if (error.name === 'MongoError') {
        return res.status(500).json({ success: false, message: "Database Error", details: error.message });
      }

      // Catch-all for other errors
      return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
    }
  }
);

// @route    POST api/files/delete
// @desc     Delete whole files
// @access   Private
FileRouter.post(
  "/delete",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    const files = req.body.items;

    try {
      const result = await File.deleteMany({ _id: { $in: files } });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'No files found matching the request' });
      }

      try {
        const fileList = await File.find().sort({ date: -1 });
        logLogger.debug('Files deleted successfully');
        return res.json({ message: 'Files deleted successfully', deletedCount: result.deletedCount, files: fileList });
      } catch(err: any) {
        errorLogger.error("Error when  getting files, ", err);
        // Check for validation errors
        if (err.name === 'ValidationError') {
          return res.status(400).json({ success: false, message: "Validation Error", details: err.errors });
        }
        // Handle other types of errors (e.g., database connection issues)
        if (err.name === 'MongoError') {
          return res.status(500).json({ success: false, message: "Database Error", details: err.message });
        }
        // Catch-all for other errors
        return res.status(500).json({ success: false, message: "Unknown Error", details: err.message });
      }
    } catch (error: any) {
      errorLogger.error("Error when deleting files, ", error);

      // Check for validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
      }

      // Handle other types of errors (e.g., database connection issues)
      if (error.name === 'MongoError') {
        return res.status(500).json({ success: false, message: "Database Error", details: error.message });
      }

      // Catch-all for other errors
      return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
    }
  }
);

export default FileRouter;
