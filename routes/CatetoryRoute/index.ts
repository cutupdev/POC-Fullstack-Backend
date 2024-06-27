import { Request, Response, Router } from "express";
import { check, validationResult } from "express-validator";
import { errorLogger, logLogger } from "../../utils/logger";
import Category from "../../model/CategoryModel";
import dotenv from "dotenv";
import { AuthRequest, authMiddleware } from "../../middleware";

dotenv.config();

// Create a new instance of the Express Router
const CategoryRouter = Router();

// @route    POST api/category/newCategory
// @desc     Create new category
// @access   Private
CategoryRouter.post(
  "/newCategory",
  check("name", "Name is required").notEmpty(),
  check("files", "Files is required").notEmpty(),
  check("created", "Date is required").notEmpty(),
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }
    
    try {
      
      const category = new Category({
        name: req.body.name,
        sample: req.body.files,
        createDate: req.body.created,
        trainDate: req.body.created,
        trainStatus: 'Completed',
      });

      try {
        let savedCategory = await category.save();
        logLogger.debug("Category saved successfully, ", savedCategory);
        return res.json({ success: true, newCategory: savedCategory });
      } catch(error: any) {
        errorLogger.error("Error when saving new category, ", error);
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
      errorLogger.error("Error when saving new file for category: ", error);
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

// @route    Get api/category/getCategories
// @desc     Get whole categories
// @access   Private
CategoryRouter.get(
  "/getCategories",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      // const categoryList = await Category.aggregate([
      //   {$lookup: {
      //     from: 'file',
      //     localField: 'sample',
      //     foreignField: '_id',
      //     as: 'category_to_file'
      //   }},
      //   {$sort: { trainDate: -1 }}
      // ])
      const categoryList = await Category.find().sort({ trainDate: -1 });
      return res.json({success: true, categories: categoryList});

    } catch (error: any) {
      errorLogger.error("Error when getting categories: ", error);

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

// @route    Post api/category/editCategory
// @desc     Edit one category
// @access   Private
CategoryRouter.post(
  "/editCategory",
  check("name", "Name is required").notEmpty(),
  check("files", "Files is required").notEmpty(),
  check("updated", "Date is required").notEmpty(),
  check("id", "Data id is required").notEmpty(),
  authMiddleware,
  async (req: AuthRequest, res: Response) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      let editedCategory = await Category.findOneAndUpdate(
        { _id: req.body.id },
        { $set: { name: req.body.name, sample: req.body.files, trainDate: req.body.updated } },
        { new: true }
      )
      logLogger.debug("Category edited successfully, ", editedCategory);
      const categoryList = await Category.find().sort({ trainDate: -1 });
      return res.json({success: true, editCategory: categoryList});

    } catch (error: any) {
      errorLogger.error("Error when editing category: ", error);

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

export default CategoryRouter;
