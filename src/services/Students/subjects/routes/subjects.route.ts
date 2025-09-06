import express from "express";
import createSubjectsRouter from "../CreateSubjects/routes/CreateSubject.routes";

const subjectsRouter = express.Router();

subjectsRouter.use(createSubjectsRouter);

export default subjectsRouter;
