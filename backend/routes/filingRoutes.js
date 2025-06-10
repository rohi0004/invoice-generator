import express from 'express';
import {
  createFiling,
  getFilings,
  getFilingById,
  updateFiling,
  deleteFiling,
  sendReceipt,
  downloadReceipt
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

// @desc    Send receipt via email or mobile
// @route   POST /api/filings/:id/send-receipt
// @access  Public
router.post('/:id/send-receipt', sendReceipt);

// @desc    Download filing receipt as PDF
// @route   GET /api/filings/:id/download-receipt
// @access  Public
router.get('/:id/download-receipt', downloadReceipt);

export default router;
