"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const FileSchema = new mongoose_1.default.Schema({
    filename: { type: String, required: true, },
    type: { type: String, required: true },
    size: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now() },
    creatorName: { type: String, required: true },
});
const FileModel = mongoose_1.default.model("file", FileSchema);
exports.default = FileModel;
