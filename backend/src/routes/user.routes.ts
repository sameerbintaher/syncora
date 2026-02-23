import { Router } from 'express';
import { body, param } from 'express-validator';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { uploadAvatar } from '../middleware/upload';

const router = Router();
router.use(authenticate);

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Letters, numbers, underscores only'),
  body('bio').optional().trim().isLength({ max: 160 }).withMessage('Bio max 160 characters'),
];

const userIdValidation = [param('userId').isMongoId().withMessage('Invalid user ID')];

router.get('/me', userController.getMe.bind(userController));
router.get('/search', userController.searchUsers.bind(userController));
router.get('/blocked', userController.getBlockedUsers.bind(userController));
router.get('/:userId', validate(userIdValidation), userController.getUserById.bind(userController));
router.patch('/me', validate(updateProfileValidation), userController.updateProfile.bind(userController));
router.post('/me/avatar', uploadAvatar, userController.uploadAvatar.bind(userController));
router.post('/:userId/block', validate(userIdValidation), userController.blockUser.bind(userController));
router.delete('/:userId/block', validate(userIdValidation), userController.unblockUser.bind(userController));

export default router;
