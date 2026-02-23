import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomReadStatus {
  userId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  lastReadAt: Date;
}

export interface IRoomReadStatusDocument extends IRoomReadStatus, Document {}

const schema = new Schema<IRoomReadStatusDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    lastReadAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

schema.index({ userId: 1, roomId: 1 }, { unique: true });
schema.index({ roomId: 1 });

export const RoomReadStatus = mongoose.model<IRoomReadStatusDocument>('RoomReadStatus', schema);
