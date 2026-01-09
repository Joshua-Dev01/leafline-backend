// // src/services/Events/model/events.model.ts
// import { Schema, model, Document } from "mongoose";

// export interface IEvent extends Document {
//   title: string;
//   interestedUsers: string[];
//   goingUsers: string[];
//   startDate: Date;
//   endDate: Date;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const EventSchema = new Schema<IEvent>(
//   {
//     title: { type: String, required: true },
//     interestedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
//     goingUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
//     startDate: { type: Date, required: true },
//     endDate: { type: Date, required: true },
//   },
//   { timestamps: true }
// );

// export const Event = model<IEvent>("Event", EventSchema);
