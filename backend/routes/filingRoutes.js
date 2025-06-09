import express from 'express';
import {
  createFiling,
  getFilings,
  getFilingById,
  updateFiling,
  deleteFiling
} from '../controllers/filingController.js';

const router = express.Router();

// @desc    Create new filing
// @route   POST /api/filings
// @access  Private
router.post('/', createFiling);

// @desc    Get all filings
// @route   GET /api/filings
// @access  Private
router.get('/', getFilings);

// @desc    Get filing by ID
// @route   GET /api/filings/:id
// @access  Private
router.get('/:id', getFilingById);

// @desc    Update filing
// @route   PUT /api/filings/:id
// @access  Private
router.put('/:id', updateFiling);

// @desc    Delete filing
// @route   DELETE /api/filings/:id
// @access  Private
router.delete('/:id', deleteFiling);

export default router;
