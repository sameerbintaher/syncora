import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';
import { Request } from 'express';

const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new AppError('Only JPEG, PNG, WebP, and GIF images are allowed', 400));
};

const roomUploadDir = path.join(process.cwd(), 'uploads', 'rooms');
if (!fs.existsSync(roomUploadDir)) {
  fs.mkdirSync(roomUploadDir, { recursive: true });
}

const roomStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, roomUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

export const uploadRoomAvatar = multer({
  storage: roomStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');
