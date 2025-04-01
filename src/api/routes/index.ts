import { Router } from 'express';
import authRoutes from './auth';
import monitoringRoutes from './monitoring';
import webhookRoutes from './webhooks';
import blockchainRoutes from './blockchain';

const router = Router();

// Mount API routes
router.use('/auth', authRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/blockchain', blockchainRoutes);

export default router;
