import { Router } from 'express';
import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { uploadRoomAvatar } from '../middleware/upload';

const router = Router();

router.use(authenticate);

const mongoId = (field: string) => param(field).isMongoId().withMessage(`Invalid ${field}`);

const createRoomValidation = [
  body('type').isIn(['direct', 'group']).withMessage('Room type must be direct or group'),
  body('memberIds')
    .isArray({ min: 1 }).withMessage('At least one member required')
    .custom((ids) => Array.isArray(ids) && ids.every((id: any) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage('Invalid member ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name max 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description max 500 characters'),
];

const searchValidation = [
  query('q').notEmpty().withMessage('Search query required').trim().isLength({ min: 2, max: 50 }).withMessage('Search query 2–50 characters'),
];

const roomIdValidation = [mongoId('roomId')];
const limitValidation = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('cursor').optional().isMongoId().withMessage('Invalid cursor'),
];

const deleteMessageValidation = [
  body('messageId').isMongoId().withMessage('Invalid message ID'),
  body('roomId').optional().isMongoId().withMessage('Invalid room ID'),
];

const reactValidation = [
  body('messageId').isMongoId().withMessage('Invalid message ID'),
  body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji required'),
];

const forwardValidation = [
  body('messageId').isMongoId().withMessage('Invalid message ID'),
  body('targetRoomId').isMongoId().withMessage('Invalid room ID'),
];

const addMembersValidation = [
  body('memberIds').isArray({ min: 1 }).withMessage('memberIds array required'),
  body('memberIds.*').isMongoId().withMessage('Invalid member ID'),
];

const updateNameValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name 1–100 characters'),
];

router.post('/', validate(createRoomValidation), chatController.createRoom.bind(chatController));
router.get('/', chatController.getRooms.bind(chatController));
router.get('/users/search', validate(searchValidation), chatController.searchUsers.bind(chatController));
router.post('/messages/delete-me', validate(deleteMessageValidation), chatController.deleteForMe.bind(chatController));
router.post('/messages/delete-everyone', validate([body('messageId').isMongoId()]), chatController.deleteForEveryone.bind(chatController));
router.post('/messages/react', validate(reactValidation), chatController.addReaction.bind(chatController));
router.post('/messages/react/remove', validate([body('messageId').isMongoId()]), chatController.removeReaction.bind(chatController));
router.post('/messages/forward', validate(forwardValidation), chatController.forwardMessage.bind(chatController));

router.get('/:roomId', validate(roomIdValidation), chatController.getRoom.bind(chatController));
router.get('/:roomId/messages', validate([...roomIdValidation, ...limitValidation]), chatController.getMessages.bind(chatController));
router.patch('/:roomId/name', validate([...roomIdValidation, ...updateNameValidation]), chatController.updateGroupName.bind(chatController));
router.post('/:roomId/avatar', validate(roomIdValidation), uploadRoomAvatar, chatController.uploadGroupAvatar.bind(chatController));
router.post('/:roomId/members', validate([...roomIdValidation, ...addMembersValidation]), chatController.addMembers.bind(chatController));
router.delete('/:roomId/members/:userId', validate([mongoId('roomId'), mongoId('userId')]), chatController.removeMember.bind(chatController));
router.post('/:roomId/admins/:userId', validate([mongoId('roomId'), mongoId('userId')]), chatController.promoteAdmin.bind(chatController));
router.delete('/:roomId/admins/:userId', validate([mongoId('roomId'), mongoId('userId')]), chatController.demoteAdmin.bind(chatController));
router.post('/:roomId/leave', validate(roomIdValidation), chatController.leaveGroup.bind(chatController));

export default router;
