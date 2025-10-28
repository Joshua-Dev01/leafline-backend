
import express from "express";
import signupRouter from "../signup/routes/signup.routes";


const Authrouter = express.Router();


Authrouter.use("/auth", signupRouter);

export default Authrouter;
