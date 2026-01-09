import mongoose, { Schema, Document } from "mongoose";

export interface ITask {
    _id?: mongoose.Types.ObjectId; // optional for new tasks
    title: string;
    assignedTo: mongoose.Types.ObjectId;
    status: "pending" | "in-progress" | "completed";
}

export interface IProject extends Document {
    title: string;
    description?: string;
    createdBy: mongoose.Types.ObjectId;
    tasks: mongoose.Types.DocumentArray<ITask>; 
    collaborators: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
    {
        title: { type: String, required: true },
        assignedTo: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
        status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
    },
    { _id: true }
);

const projectSchema = new Schema<IProject>(
    {
        title: { type: String, required: true },
        description: String,
        createdBy: { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
        tasks: [taskSchema],
        collaborators: [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    },
    { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
