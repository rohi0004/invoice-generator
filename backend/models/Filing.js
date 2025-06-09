import mongoose from 'mongoose';

// Item schema for individual items in a filing
const itemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
});

// Filing schema for the overall filing information
const filingSchema = new mongoose.Schema({
  shipment_id: { type: String, required: true },
  invoice_no: { type: String, required: true },
  port: { type: String, required: true },
  value: { type: Number, required: true, min: 0 },
  items: { type: [itemSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
  status: { type: String, default: 'Submitted' },
  submission_date: { type: Date, default: Date.now }
});

// Export the Filing model based on the filingSchema
export default mongoose.model('Filing', filingSchema);
