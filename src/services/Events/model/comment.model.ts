import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  eventId:     mongoose.Types.ObjectId;
  userId:      mongoose.Types.ObjectId;
  userName:    string;
  userAvatar?: string;
  text:        string;
  likes:       mongoose.Types.ObjectId[];
  parentId?:   mongoose.Types.ObjectId | null;   // null = top-level comment
  createdAt:   Date;
  updatedAt:   Date;
}

const commentSchema = new Schema<IComment>(
  {
    eventId:    { type: Schema.Types.ObjectId, ref: "Event",        required: true },
    userId:     { type: Schema.Types.ObjectId, ref: "LeafLineUser", required: true },
    userName:   { type: String, required: true },
    userAvatar: { type: String },
    text:       { type: String, required: true, trim: true, maxlength: 1000 },
    likes:      [{ type: Schema.Types.ObjectId, ref: "LeafLineUser" }],
    parentId:   { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

commentSchema.index({ eventId: 1, parentId: 1, createdAt: -1 });

// Virtual: reply count (populated on demand)
commentSchema.virtual("replyCount", {
  ref:          "Comment",
  localField:   "_id",
  foreignField: "parentId",
  count:        true,
});

export const Comment = mongoose.model<IComment>("Comment", commentSchema);