import { Router } from 'express';
import { db, activities } from '../db/index.js';

const router = Router();

// GET /api/v1/activities
router.get('/', async (req, res, next) => {
  try {
    const { projectId, limit = '20' } = req.query;
    
    let query = db.query.activities.findMany({
      orderBy: (activities, { desc }) => [desc(activities.createdAt)],
      limit: parseInt(limit as string),
    });
    
    const allActivities = await query;
    
    // Filter by project if specified
    const filteredActivities = projectId 
      ? allActivities.filter(a => a.projectId === projectId)
      : allActivities;
    
    res.json({ data: filteredActivities });
  } catch (error) {
    next(error);
  }
});

export { router as activityRoutes };
