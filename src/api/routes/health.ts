import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check the health status of the service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-10-26T12:00:00.000Z
 *       500:
 *         description: Service is unhealthy or an error occurred
 */
router.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
