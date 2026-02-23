import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'emoji';

export interface IReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId;
}

export interface IReply {
  messageId: mongoose.Types.ObjectId;
  content: string;
  senderUsername: string;
}

export interface IForward {
  originalMessageId: mongoose.Types.ObjectId;
  originalSenderId: mongoose.Types.ObjectId;
}

export interface IMention {
  userId: mongoose.Types.ObjectId;
  username: string;
}

export interface IMessage {
  room: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: MessageType;
  readBy: mongoose.Types.ObjectId[];
  seenBy?: mongoose.Types.ObjectId[];
  deliveredTo: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  reply?: IReply;
  forward?: IForward;
  mentions?: IMention[];
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  deletedForEveryone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document {}

const reactionSchema = new Schema<IReaction>(
  { emoji: String, userId: { type: Schema.Types.ObjectId, ref: 'User' } },
  { _id: false }
);

const replySchema = new Schema<IReply>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    content: String,
    senderUsername: String,
  },
  { _id: false }
);

const forwardSchema = new Schema<IForward>(
  {
    originalMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    originalSenderId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const mentionSchema = new Schema<IMention>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User' }, username: String },
  { _id: false }
);

const messageSchema = new Schema<IMessageDocument>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 4000 },
    type: { type: String, enum: ['text', 'image', 'file', 'system', 'emoji'], default: 'text' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [reactionSchema],
    reply: replySchema,
    forward: forwardSchema,
    mentions: [mentionSchema],
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deleted: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ room: 1 });
messageSchema.index({ room: 1, sender: 1 });
messageSchema.index({ createdAt: -1 });

messageSchema.virtual('chatId').get(function (this: IMessageDocument) {
  return this.room;
});

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema);
