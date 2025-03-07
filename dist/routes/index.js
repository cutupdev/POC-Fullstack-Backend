"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileRouter = exports.UserRouter = void 0;
const UserRoute_1 = __importDefault(require("./UserRoute"));
exports.UserRouter = UserRoute_1.default;
const FileRoute_1 = __importDefault(require("./FileRoute"));
exports.FileRouter = FileRoute_1.default;
