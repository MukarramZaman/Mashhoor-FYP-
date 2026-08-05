import mongoose, { Document, Schema } from "mongoose";

export interface IReport extends Document {
  reportedUser: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "dismissed";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>("Report", ReportSchema);
