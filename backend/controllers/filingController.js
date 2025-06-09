import Filing from '../models/Filing.js';

export const createFiling = async (req, res) => {
  try {
    const filing = new Filing({
      ...req.body,
      submission_date: new Date(),
      status: 'Submitted'
    });
    const saved = await filing.save();

    // Simulate webhook/EDI trigger
    setTimeout(() => {
      console.log(`EDI/Webhook triggered for Filing ID: ${saved._id}`);
    }, 1000);

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const getFilings = async (req, res) => {
  try {
    const filings = await Filing.find();
    res.status(200).json(filings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getFilingById = async (req, res) => {
  try {
    const filing = await Filing.findById(req.params.id);
    if (!filing) return res.status(404).json({ message: 'Filing not found' });
    res.status(200).json(filing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateFiling = async (req, res) => {
  try {
    const filing = await Filing.findById(req.params.id);
    if (!filing) {
      return res.status(404).json({ message: 'Filing not found' });
    }

    // Update the filing with new values
    const updatedFiling = await Filing.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        // Preserve the original submission date
        submission_date: filing.submission_date
      },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedFiling);
  } catch (err) {
    // If the error is due to validation
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    // If the error is due to invalid ObjectId
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid filing ID format' });
    }
    res.status(500).json({ message: err.message });
  }
};

export const deleteFiling = async (req, res) => {
  try {
    const deleted = await Filing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Filing not found' });
    res.status(200).json({ message: 'Filing deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
