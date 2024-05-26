import mongoose from "mongoose";

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true, },
  type: { type: String, required: true },
  size: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now() },
  creatorName: { type: String, required: true },
});

const FileModel = mongoose.model("file", FileSchema);

export default FileModel;
