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
const express_validator_1 = require("express-validator");
const nodemailer_1 = __importDefault(require("nodemailer"));
const js_base64_1 = require("js-base64");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserModel_1 = __importDefault(require("../../model/UserModel"));
const middleware_1 = require("../../middleware");
const config_1 = require("../../config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function validateUsername(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield UserModel_1.default.findOne({ username });
        if (user)
            return false;
        return true;
    });
}
// Create a new instance of the Express Router
const UserRouter = (0, express_1.Router)();
// @route    GET api/users
// @desc     Get user by token
// @access   Private
UserRouter.get("/", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield UserModel_1.default.findById(req.user.id).select([
            "-password",
            "-mnemonic",
            "-role",
            "-referrerlId",
        ]);
        res.json(user);
    }
    catch (err) {
        console.error(err.message);
        return res.status(500).send({ error: err });
    }
}));
// @route    GET api/users/username
// @desc     Is username available
// @access   Public
UserRouter.get("/username", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.query;
        const isValid = yield validateUsername(username);
        return res.json({ isValid });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    POST api/users/signup
// @desc     Register user
// @access   Public
UserRouter.post("/signup", (0, express_validator_1.check)("username", "Username is required").notEmpty(), (0, express_validator_1.check)("email", "Please include a valid email").isEmail(), (0, express_validator_1.check)("password", "Please enter a password with 12 or more characters").isLength({ min: 12 }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("signup-", req.body);
    try {
        const transporter = nodemailer_1.default.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        // Provide a secret key type, it can generally be a string or a buffer
        const secretKey = "ourSecretKey";
        // Define the payload
        const payloadMail = {
            data: "Token Data",
        };
        // Generate the JWT token with a specified expiry time
        const tokenMail = jsonwebtoken_1.default.sign(payloadMail, secretKey, {
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
              <a href="https://poc-fullstack-frontend.vercel.app/${req.body.email}/verify/${tokenMail}" target="_blank">Email Verification</a>
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
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array() });
        }
        const { username, email, password, encodedReferrer } = req.body;
        const userExists = yield UserModel_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }
        let referrerId = null;
        if (encodedReferrer) {
            const referrerEmail = (0, js_base64_1.decode)(encodedReferrer);
            const referrer = yield UserModel_1.default.findOne({ email: referrerEmail });
            referrerId = (referrer === null || referrer === void 0 ? void 0 : referrer._id.toString()) || null;
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const user = new UserModel_1.default({
            username,
            email,
            password: hashedPassword,
            verified: false,
        });
        user
            .save()
            .then((response) => {
            transporter.sendMail(mailConfigurations, function (error, info) {
                if (error) {
                    console.log(error);
                    return res.json({ success: false, mail: "Can't send email!" });
                }
                else {
                    console.log("Email Sent Successfully");
                    console.log(info);
                    return res.json({ success: true });
                }
            });
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't regist user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    POST api/users/verify
// @desc     Is user verified
// @access   Public
UserRouter.post("/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("verify token-", req.body);
    try {
        const { token } = req.body;
        console.log(token);
        // Verifying the JWT token
        jsonwebtoken_1.default.verify(token, "ourSecretKey", (err, decode) => {
            if (err) {
                console.log(err);
                console.log("1111111");
                return res
                    .status(400)
                    .json({ success: false, error: "Email verification failed!" });
            }
            else {
                UserModel_1.default.findOneAndUpdate({ email: req.body.email }, { $set: { verified: true } }, { new: true })
                    .then(response => {
                    console.log("1111111");
                    return res.json({
                        success: true,
                        mail: "Email verification successed!",
                    });
                })
                    .catch(error => {
                    console.log("1111111");
                    console.log(error);
                    return res.status(400).json({ success: false, error: "Email verification failed!" });
                });
            }
        });
    }
    catch (error) {
        console.log("1111111");
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    Post api/users/forgotPassword
// @desc     Is user verified
// @access   Public
UserRouter.post("/forgotPassword", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("forget password-", req.body);
    try {
        const email = req.body.email;
        UserModel_1.default.findOne({ email: email })
            .then((data) => {
            if (data) {
                const transporter = nodemailer_1.default.createTransport({
                    service: process.env.EMAIL_SERVICE,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: .EMAIL_PASS,
                    },
                });
                // Provide a secret key type, it can generally be a string or a buffer
                const secretKey = "ourSecretKey";
                // Define the payload
                const payloadMail = {
                    data: "Reset Data",
                };
                // Generate the JWT token with a specified expiry time
                const tokenMail = jsonwebtoken_1.default.sign(payloadMail, secretKey, {
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
                  <a href="https://poc-fullstack-frontend.vercel.app/${email}/reset-password/${tokenMail}" target="_blank">Reset Password</a>
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
                transporter.sendMail(mailConfigurations, function (error, info) {
                    if (error) {
                        console.log(error);
                        return res.json({ success: false, mail: "Can't send email!" });
                    }
                    else {
                        console.log("Email Sent Successfully");
                        console.log(info);
                        return res.json({
                            success: true,
                            mail: "Email verification link sent!",
                        });
                    }
                });
            }
            else {
                return res.json({ success: false, mail: "Can't find email!" });
            }
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't find user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    Post api/users/resetPassword
// @desc     Is user verified
// @access   Public
UserRouter.post("/resetPassword", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("reset password-", req.body);
    try {
        const email = req.body.email;
        const token = req.body.token;
        const newPassword = req.body.password;
        UserModel_1.default.findOne({ email: email })
            .then((data) => {
            if (data) {
                jsonwebtoken_1.default.verify(token, "ourSecretKey", (err, decode) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).json({
                            success: false,
                            error: "Reset password failed because email verification failure!",
                        });
                    }
                    else {
                        bcryptjs_1.default.genSalt(10, (err, salt) => {
                            if (err) {
                                console.error("Error generating salt:", err);
                                return res.status(400).json({ error: "Incorrect password" });
                            }
                            else {
                                bcryptjs_1.default.hash(newPassword, salt, (err, hashedPassword) => {
                                    if (err) {
                                        console.error("Error hashing password:", err);
                                        return res
                                            .status(400)
                                            .json({ error: "Incorrect password" });
                                    }
                                    else {
                                        console.log('new pass ===> ', hashedPassword);
                                        console.log('origin pass ===> ', data.password);
                                        UserModel_1.default.findOneAndUpdate({ email: email }, {
                                            $set: {
                                                email: email,
                                                password: hashedPassword,
                                                username: data.username,
                                                verified: true,
                                            },
                                        }, { new: true })
                                            .then((data) => {
                                            return res.json({
                                                success: true,
                                                mail: "Reset password successed!",
                                            });
                                        })
                                            .catch((errors) => {
                                            console.log(errors);
                                            return res
                                                .status(400)
                                                .json({ error: "Reset password failed!" });
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            else {
                return res.json({ success: false, mail: "Can't find email!" });
            }
        })
            .catch((err) => {
            console.log(err);
            return res.json({ success: false, mail: "Can't find user!" });
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ error });
    }
}));
// @route    POST api/users/signin
// @desc     Authenticate user & get token
// @access   Public
UserRouter.post("/signin", (0, express_validator_1.check)("email", "Please include a valid email").isEmail(), (0, express_validator_1.check)("password", "Password is required").exists(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("signin-", req.body);
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ sucess: false, error: errors.array() });
    }
    const { email, password, checked } = req.body;
    try {
        let user = yield UserModel_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ sucess: false, error: "Invalid Email" });
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        // const salt = await bcrypt.genSalt(10);
        // const hashedPassword = await bcrypt.hash(password, salt);
        // console.log('real pass ===> ', user.password);
        // console.log('input pass ===> ', hashedPassword);
        if (!isMatch) {
            console.log(isMatch);
            return res.status(400).json({ sucess: false, error: "Incorrect password" });
        }
        if (!user.verified) {
            return res.status(400).json({ sucess: false, error: "Unverified member" });
        }
        const payload = {
            user: {
                email: user.email,
                verified: user.verified,
                username: user.username,
                remember: checked,
            },
        };
        jsonwebtoken_1.default.sign(payload, config_1.JWT_SECRET, { expiresIn: checked ? "90 days" : "5 days" }, (err, token) => {
            if (err) {
                return res.status(400).json({ sucess: false, error: "Incorrect password" });
            }
            else {
                return res.json({
                    success: true,
                    authToken: token,
                });
            }
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send({ success: false, error: error });
    }
}));
exports.default = UserRouter;
