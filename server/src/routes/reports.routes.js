import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getReports } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getReports);

export default router;