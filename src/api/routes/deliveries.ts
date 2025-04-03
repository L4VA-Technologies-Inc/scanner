import express, { Request, Response } from 'express';
import { query } from '../../db';
import logger from '../../utils/logger';
import { apiKeyAuth } from '../../middleware/auth';
import Joi from 'joi';

const router = express.Router();

// Validation schema for query parameters
const getDeliveriesSchema = Joi.object({
  webhookId: Joi.string().uuid(),
  eventId: Joi.string().uuid(),
  status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'RETRYING', 'FAILED', 'MAX_RETRIES_EXCEEDED'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('created_at', 'completed_at', 'next_retry_at', 'attempt_count').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

/**
 * @openapi
 * /api/deliveries:
 *   get:
 *     summary: Retrieve a list of webhook deliveries
 *     tags: [Deliveries]
 *     description: Fetches historical webhook delivery records with optional filtering, sorting, and pagination.
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: webhookId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter deliveries by a specific webhook ID.
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter deliveries for a specific event ID.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, SUCCEEDED, RETRYING, FAILED, MAX_RETRIES_EXCEEDED]
 *         description: Filter deliveries by status.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of deliveries to return.
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of deliveries to skip for pagination.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, completed_at, next_retry_at, attempt_count]
 *           default: created_at
 *         description: Field to sort the results by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sorting order (Ascending or Descending).
 *     responses:
 *       200:
 *         description: A list of webhook deliveries.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookDelivery'
 *                 totalCount:
 *                    type: integer
 *                    description: The total number of deliveries matching the filter criteria (ignoring pagination).
 *                    example: 150
 *       400:
 *         description: Invalid query parameters.
 *       401:
 *         description: Unauthorized (Missing or invalid API key).
 *       500:
 *         description: Internal server error.
 */
router.get('/', apiKeyAuth, async (req: Request, res: Response) => {
  // Validate query parameters
  const { error, value } = getDeliveriesSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: 'Invalid query parameters', details: error.details });
  }

  const { webhookId, eventId, status, limit, offset, sortBy, sortOrder } = value;

  try {
    let baseQuery = 'FROM webhook_deliveries WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (webhookId) {
      baseQuery += ` AND webhook_id = $${paramIndex++}`;
      queryParams.push(webhookId);
    }
    if (eventId) {
      baseQuery += ` AND event_id = $${paramIndex++}`;
      queryParams.push(eventId);
    }
    if (status) {
      baseQuery += ` AND status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Query for total count (without pagination)
    const countResult = await query(`SELECT COUNT(*) AS total_count ${baseQuery}`, queryParams);
    const totalCount = parseInt(countResult.rows[0].total_count, 10);

    // Query for paginated data
    const dataQuery = `SELECT * ${baseQuery} ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);

    const result = await query(dataQuery, queryParams);

    res.json({ data: result.rows, totalCount });

  } catch (err) {
    logger.error('Error fetching webhook deliveries:', err);
    res.status(500).json({ error: 'Failed to retrieve webhook deliveries' });
  }
});

export default router;
