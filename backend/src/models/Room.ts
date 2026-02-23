import mongoose, { Document, Schema } from 'mongoose';

export type RoomType = 'direct' | 'group';

export interface IRoom {
  name?: string;
  type: RoomType;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  groupName?: string;
  groupAdmin?: mongoose.Types.ObjectId;
  description?: string;
  avatar?: string;
  lastMessage?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomDocument extends IRoom, Document {}

const roomSchema = new Schema<IRoomDocument>(
  {
    name: { type: String, trim: true, maxlength: 100 },
    type: { type: String, enum: ['direct', 'group'], required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    groupName: { type: String, trim: true, maxlength: 100 },
    groupAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, maxlength: 500 },
    avatar: { type: String },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.index({ members: 1 });
roomSchema.index({ type: 1, members: 1 });
roomSchema.index({ createdAt: -1 });

roomSchema.virtual('isGroup').get(function (this: IRoomDocument) {
  return this.type === 'group';
});

export const Room = mongoose.model<IRoomDocument>('Room', roomSchema);
