import { Request, Response, Router } from "express";
import { check, validationResult } from "express-validator";
import nodemailer from "nodemailer";
import { decode } from "js-base64";
import bcrypt, { hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../model/UserModel";
import { authMiddleware, AuthRequest } from "../../middleware";
import { JWT_SECRET } from "../../config";
import dotenv from "dotenv";
import { frontUrl } from "../../utils/api";
import { defaultLogger, authLogger, errorLogger, logLogger } from "../../utils/logger";

dotenv.config();

async function validateUsername(username: string) {
  const user = await User.findOne({ username });
  if (user) return false;
  return true;
}

// Create a new instance of the Express Router
const UserRouter = Router();

// @route    GET api/users
// @desc     Get user by token
// @access   Private
UserRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select([
      "-password",
      "-mnemonic",
      "-role",
      "-referrerlId",
    ]);
    res.json(user);
  } catch (err: any) {
    errorLogger.error('Error during authentication, ', err.message);
    return res.status(500).send({ error: err });
  }
});

// @route    GET api/users/username
// @desc     Is username available
// @access   Public
UserRouter.get("/username", async (req, res) => {
  try {
    const { username } = req.query;
    const isValid = await validateUsername(username as string);
    return res.json({ isValid });
  } catch (error: any) {
    errorLogger.error('Error during username validation, ', error);
    return res.status(500).send({ error });
  }
});

// @route    POST api/users/signup
// @desc     Register user
// @access   Public
UserRouter.post(
  "/signup",
  check("username", "Username is required").notEmpty(),
  check("email", "Please include a valid email").isEmail(),
  check(
    "password",
    "Please enter a password with 12 or more characters"
  ).isLength({ min: 12 }),
  async (req: Request, res: Response) => {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      interface Payload {
        data: string;
      }

      // Provide a secret key type, it can generally be a string or a buffer
      const secretKey: string = "ourSecretKey";

      // Define the payload
      const payloadMail: Payload = {
        data: "Token Data",
      };

      // Generate the JWT token with a specified expiry time
      const tokenMail: string = jwt.sign(payloadMail, secretKey, {
        expiresIn: "10m",
      });

      const mailConfigurations = {
        // It should be a string of sender/server email
        from: process.env.EMAIL_USER,

        to: req.body.email,

        // Subject of Email
        subject: "Email Verification",

        // This would be the text of email body
        html: `<!doctype html>
        <html>
        
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        
        <body style="font-family: sans-serif;">
          <div style="display: block; margin: auto; max-width: 600px;" class="main">
            <div style="display: flex; justify-content: center;">
              <h1 style="font-size: 20px; font-weight: bold; margin-top: 20px">Email Verification</h1>
            </div>
            <p>You have created an account on our system. Please verify your account by clicking the link below. You must verify the email address to use your account.</p>
            <div style="display: flex; justify-content: center;">
              <a href="${frontUrl}/${req.body.email}/verify/${tokenMail}" target="_blank">Email Verification</a>
            </div>
          </div>
          
          <style>
            .main {
              background-color: white;
            }
        
            a:link,
            a:visited {
              background-color: #008800;
              margin-top: 30px;
              color: white;
              padding: 14px 25px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
            }
        
            a:hover,
            a:active {
              background-color: green;
            }
          </style>
        </body>
        
        </html>`,
      };

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }

      const { username, email, password, encodedReferrer } = req.body;

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: "User already exists" });
      }

      let referrerId: string | null = null;
      if (encodedReferrer) {
        const referrerEmail = decode(encodedReferrer);
        const referrer = await User.findOne({ email: referrerEmail });
        referrerId = referrer?._id.toString() || null;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        username,
        email,
        password: hashedPassword,
        verified: false,
      });

      user
        .save()
        .then((response) => {
          transporter.sendMail(
            mailConfigurations,
            function (error: any, info: any) {
              if (error) {
                errorLogger.error('Error when sending email, ', error);
                return res.json({ success: false, mail: "Can't send email!" });
              } else {
                logLogger.debug("Email Sent Successfully");
                return res.json({ success: true });
              }
            }
          );
        })
        .catch((err) => {
          errorLogger.error('Error when user signing up, ', err);
          return res.json({ success: false, mail: "Can't regist user!" });
        });
    } catch (error: any) {
      errorLogger.error('Error when user signing up, ', error);
      return res.status(500).send({ error });
    }
  }
);

// @route    POST api/users/verify
// @desc     Is user verified
// @access   Public
UserRouter.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;

    // Verifying the JWT token
    jwt.verify(token, "ourSecretKey", (err: any, decode: any) => {
      if (err) {
        errorLogger.error('Error during jwt verification, ', err);
        return res
          .status(400)
          .json({ success: false, error: "Email verification failed!" });
      } else {
        User.findOneAndUpdate(
          { email: req.body.email },
          { $set: { verified: true } },
          { new: true }
        )
          .then(response => {
            logLogger.debug('User verified successfully');
            return res.json({
              success: true,
              mail: "Email verification successed!",
            });
          })
          .catch(error => {
            errorLogger.error('User verification failed');
            return res.status(400).json({ success: false, error: "Email verification failed!" });
          })
      }
    });
  } catch (error: any) {
    errorLogger.error('Error during jwt verification, ', error);
    return res.status(500).send({ error });
  }
});

// @route    Post api/users/forgotPassword
// @desc     Is user verified
// @access   Public
UserRouter.post("/forgotPassword", async (req, res) => {
  try {
    const email = req.body.email;

    User.findOne({ email: email })
      .then((data) => {
        if (data) {
          const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          interface Payload {
            data: string;
          }

          // Provide a secret key type, it can generally be a string or a buffer
          const secretKey: string = "ourSecretKey";

          // Define the payload
          const payloadMail: Payload = {
            data: "Reset Data",
          };

          // Generate the JWT token with a specified expiry time
          const tokenMail: string = jwt.sign(payloadMail, secretKey, {
            expiresIn: "10m",
          });

          const mailConfigurations = {
            // It should be a string of sender/server email
            from: process.env.EMAIL_USER,

            to: email,

            // Subject of Email
            subject: "Reset Password",

            // This would be the text of email body
            html: `<!doctype html>
            <html>
            
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            </head>
            
            <body style="font-family: sans-serif;">
              <div style="display: block; margin: auto; max-width: 600px;" class="main">
                <div style="display: flex; justify-content: center;">
                  <h1 style="font-size: 20px; font-weight: bold; margin-top: 20px">Reset Password</h1>
                </div>
                <p>We received your request to reset your account password.</p>
                <p>Click the button below to create your new password. Your password will not be reset if no action is taken and your old password will continue to work</p>
                <div style="display: flex; justify-content: center;">
                  <a href="${frontUrl}/${email}/reset-password/${tokenMail}" target="_blank">Reset Password</a>
                </div>
              </div>
              
              <style>
                .main {
                  background-color: white;
                }
            
                a:link,
                a:visited {
                  background-color: #008800;
                  margin-top: 30px;
                  color: white;
                  padding: 14px 25px;
                  text-align: center;
                  text-decoration: none;
                  display: inline-block;
                }
            
                a:hover,
                a:active {
                  background-color: green;
                }
              </style>
            </body>
            
            </html>`,
          };

          transporter.sendMail(
            mailConfigurations,
            function (error: any, info: any) {
              if (error) {
                errorLogger.error('Error when sending message, ', error);
                return res.json({ success: false, mail: "Can't send email!" });
              } else {
                logLogger.debug("Email Sent Successfully");
                return res.json({
                  success: true,
                  mail: "Email verification link sent!",
                });
              }
            }
          );
        } else {
          return res.json({ success: false, mail: "Can't find email!" });
        }
      })
      .catch((err) => {
        errorLogger.error("Can't find corect user");
        return res.json({ success: false, mail: "Can't find user!" });
      });
  } catch (error: any) {
    errorLogger.error('Error when sending message, ', error);
    return res.status(500).send({ error });
  }
});

// @route    Post api/users/resetPassword
// @desc     Is user verified
// @access   Public
UserRouter.post("/resetPassword", async (req, res) => {
  try {
    const email = req.body.email;
    const token = req.body.token;
    const newPassword = req.body.password;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const data = await User.findOne({ email: email });

    if (!data) {
      return res.json({ success: false, mail: "Can't find user!" });
    }

    jwt.verify(token, "ourSecretKey", (err: any, decode: any) => {
      if (err) {
        errorLogger.error('Error during jwt verification, ', err);
        return res.status(400).json({
          success: false,
          error:
            "Reset password failed because email verification failure!",
        });
      } else {
        User.findOneAndUpdate(
          { email: email },
          {
            $set: {
              email: email,
              password: hashedPassword,
              username: data.username,
              verified: true,
            },
          },
          { new: true }
        )
          .then((data) => {
            return res.json({
              success: true,
              mail: "Reset password successed!",
            });
          })
          .catch((errors) => {
            errorLogger.error('Error when updating password, ', errors);
            return res
              .status(400)
              .json({ error: "Reset password failed!" });
          });
      }
    });
  } catch (error: any) {
    errorLogger.error('Reset password error, ', error);
    return res.status(500).send({ error });
  }
});

// @route    POST api/users/signin
// @desc     Authenticate user & get token
// @access   Public
UserRouter.post(
  "/signin",
  check("email", "Please include a valid email").isEmail(),
  check("password", "Password is required").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ sucess: false, error: errors.array() });
    }

    const { email, password, checked } = req.body;

    try {

      try {
        let user = await User.findOne({ email });
        if (!user) {
          return res.status(400).json({ sucess: false, error: "Invalid Email" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          errorLogger.error('Incorrect password');
          return res.status(400).json({ sucess: false, error: "Incorrect password" });
        }

        if (!user.verified) {
          return res.status(400).json({ sucess: false, error: "Unverified member" });
        }

        authLogger.info('User login --> ', "email: ", user.email, ", username: ", user.username, ', IP address: ', req.socket.localAddress);

        const payload = {
          user: {
            email: user.email,
            verified: user.verified,
            username: user.username,
            role: user.role,
            remember: checked,
          },
        };

        jwt.sign(
          payload,
          JWT_SECRET,
          { expiresIn: checked ? "90 days" : "5 days" },
          (err, token) => {
            if (err) {
              return res.status(400).json({ sucess: false, error: "Incorrect password" });
            } else {
              return res.json({
                success: true,
                authToken: token,
              });
            }
          }
        );

      } catch (error: any) {
        errorLogger.error('Error fetching user, ', error);

        if (error.name === 'CastError') {
          return res.status(400).json({ success: false, message: "Invalid user ID format", details: error.message });
        } else if (error.name === 'ValidationError') {
          return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
        } else if (error.name === 'MongoError') {
          return res.status(500).json({ success: false, message: "Database Error", details: error.message });
        } else {
          return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
        }
      }

    } catch (error: any) {
      errorLogger.error('Sign in error, ', error);
      return res.status(500).send({ success: false, error: error });
    }
  }
);

// @route    POST api/users/profile
// @desc     Modify user profile
// @access   Private
UserRouter.post(
  "/profile",
  check("email", "Please include a valid email").isEmail(),
  check("name", "Name is required").exists(),
  authMiddleware,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ sucess: false, error: errors.array() });
    }

    const { email, name, checked } = req.body;

    try {

      try {

        let user = await User.findOneAndUpdate(
          { email: email },
          { $set: { username: name } },
          { new: true }
        )
        
        if (!user) {
          return res.status(400).json({ sucess: false, error: "Invalid Email" });
        }

        const payload = {
          user: {
            email: user.email,
            verified: user.verified,
            username: user.username,
            remember: checked,
            role: user.role
          },
        };

        jwt.sign(
          payload,
          JWT_SECRET,
          { expiresIn: checked ? "90 days" : "5 days" },
          (err, token) => {
            if (err) {
              return res.status(400).json({ sucess: false, error: "Incorrect password" });
            } else {
              return res.json({
                success: true,
                authToken: token,
              });
            }
          }
        );
        
      } catch (error: any) {
        errorLogger.error('Error fetching user, ', error);

        if (error.name === 'CastError') {
          return res.status(400).json({ success: false, message: "Invalid user ID format", details: error.message });
        } else if (error.name === 'ValidationError') {
          return res.status(400).json({ success: false, message: "Validation Error", details: error.errors });
        } else if (error.name === 'MongoError') {
          return res.status(500).json({ success: false, message: "Database Error", details: error.message });
        } else {
          return res.status(500).json({ success: false, message: "Unknown Error", details: error.message });
        }
      }

    } catch (error: any) {
      errorLogger.error('Profile edit error, ', error);
      return res.status(500).send({ success: false, error: error });
    }
  }
);

export default UserRouter;
