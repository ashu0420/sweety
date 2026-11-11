import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
    createReading,
    getReadings,
    updateReading,
    deleteReading,
} from '../controllers/readings.controller.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createReading);
router.get('/', getReadings);
router.put('/:id', updateReading);
router.delete('/:id', deleteReading);

export default router;