import mongoose from "mongoose";
import FileModel from "../FileModel";

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, },
  sample: [{ type: String }],
  createDate: { type: Date, required: true, default: Date.now() },
  trainDate: { type: Date, required: true, default: Date.now() },
  trainStatus: { type: String, required: true },
});

const CategoryModel = mongoose.model("category", CategorySchema);

export default CategoryModel;
