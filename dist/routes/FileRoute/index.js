"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FileModel_1 = __importDefault(require("../../model/FileModel"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create a new instance of the Express Router
const FileRouter = (0, express_1.Router)();
// @route    POST api/files/newUpload
// @desc     Upload new data
// @access   Public
FileRouter.post("/newUpload", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("File inf saving started ===> ", req.body);
        const file = new FileModel_1.default({
            filename: req.body.filename,
            type: req.body.type,
            size: req.body.size,
            creatorName: req.body.creatorName,
        });
        file
            .save()
            .then((response) => {
            console.log(response);
            return res.json({ success: true, mail: "Saved successfully!" });
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't save the file!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
exports.default = FileRouter;
