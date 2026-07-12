import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import Research from '../models/Research.js';

const router = express.Router();

// Apply auth middleware to all history/details routes
router.use(requireAuth);

// @route   GET /api/history
// @desc    Get the last 10 researches of the logged-in user
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const history = await Research.find({ userId: req.userId })
      .select('_id companyName verdict confidence createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[routes/history] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve research history.'
    });
  }
});

// @route   GET /api/research/:id
// @desc    Get a single full research report by ID (must belong to requester)
// @access  Private
router.get('/research/:id', async (req, res) => {
  try {
    const report = await Research.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Research report not found or unauthorized access.'
      });
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('[routes/history] Error fetching report details:', error);
    // Handle invalid Object ID casting gracefully
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Research report not found.'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve research details.'
    });
  }
});

export default router;
