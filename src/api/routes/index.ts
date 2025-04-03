import { Router } from 'express';
import authRoutes from './auth';
import monitoringRoutes from './monitoring';
import webhookRoutes from './webhooks';
import blockchainRoutes from './blockchain';
import deliveryRoutes from './deliveries';

const router = Router();

// Mount API routes
router.use('/auth', authRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/blockchain', blockchainRoutes);
router.use('/deliveries', deliveryRoutes);

export default router;
