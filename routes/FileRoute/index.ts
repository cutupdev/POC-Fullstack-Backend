import { Request, Response, Router } from "express";
import File from "../../model/FileModel";
import dotenv from "dotenv";
import { AuthRequest, authMiddleware } from "../../middleware";

dotenv.config();

// Create a new instance of the Express Router
const FileRouter = Router();

// @route    POST api/files/newUpload
// @desc     Upload new data
// @access   Public
FileRouter.post(
  "/newUpload",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    console.log(req.body);
    try {
      console.log("File inf saving started ===> ", req.body);
      const file = new File({
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

    } catch (error: any) {
      console.error(error);
      return res.status(500).send({ error });
    }
  }
);

export default FileRouter;
