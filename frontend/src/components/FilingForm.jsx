import React, { useState, useEffect } from 'react';
import { createFiling } from '../services/filingService';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/FilingForm.css';

const FilingForm = () => {
  const [form, setForm] = useState({
    shipment_id: '',
    invoice_no: '',
    port: '',
    value: '',
    items: [{ description: '', quantity: '', price: '' }],
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Validate form fields
  const validate = () => {
    const errs = {};
    if (!form.shipment_id.trim()) errs.shipment_id = 'Shipment ID is required.';
    if (!form.invoice_no.trim()) errs.invoice_no = 'Invoice Number is required.';
    if (!form.port.trim()) errs.port = 'Port is required.';
    if (!form.value || isNaN(form.value) || Number(form.value) <= 0) errs.value = 'Value must be a positive number.';

    form.items.forEach((item, idx) => {
      if (!item.description.trim()) errs[`desc${idx}`] = 'Description is required.';
      if (!item.quantity || isNaN(item.quantity) || Number(item.quantity) <= 0) errs[`qty${idx}`] = 'Quantity must be > 0.';
      if (item.price === '' || isNaN(item.price) || Number(item.price) < 0) errs[`price${idx}`] = 'Price must be >= 0.';
    });

    return errs;
  };

  // Handle form inputs change (shipment_id, invoice_no, port, value)
  const handleChange = (e, index = null) => {
    const { name, value } = e.target;
    if (index !== null) {
      const updatedItems = [...form.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: name === 'description' ? value : value.replace(/[^0-9.]/g, ''), // allow only numbers and dot for qty & price
      };
      setForm({ ...form, items: updatedItems });
    } else {
      setForm({ ...form, [name]: name === 'value' ? value.replace(/[^0-9.]/g, '') : value });
    }
  };

  // Add new empty item to items list
  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: '', quantity: '', price: '' }] });
  };

  // Remove item from list
  const removeItem = (index) => {
    if (form.items.length === 1) return; // Don't remove last item
    const updatedItems = form.items.filter((_, idx) => idx !== index);
    setForm({ ...form, items: updatedItems });
  };

  // Calculate subtotal for an item
  const itemSubtotal = (item) => {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.price);
    if (isNaN(qty) || isNaN(price)) return 0;
    return qty * price;
  };

  // Calculate total value of all items
  const calculateItemsTotal = () => {
    return form.items.reduce((acc, item) => acc + itemSubtotal(item), 0);
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      // Optionally sync value with sum of items
      const totalItemsValue = calculateItemsTotal();
      const payload = {
        ...form,
        value: Number(form.value) !== totalItemsValue ? totalItemsValue : Number(form.value),
      };
      await createFiling(payload);
      alert('Filing submitted successfully!');
      setForm({
        shipment_id: '',
        invoice_no: '',
        port: '',
        value: '',
        items: [{ description: '', quantity: '', price: '' }],
      });
      setErrors({});
      setShowInvoice(false);
    } catch (error) {
      alert(`Failed to submit: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Show invoice preview
  const handleShowInvoice = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setShowInvoice(true);
    } else {
      setShowInvoice(false);
    }
  };

  // Stripe payment handler
  const handleStripePayment = async () => {
    const amount = calculateItemsTotal();
    if (!amount || amount <= 0) {
      alert('Total amount must be greater than 0 to pay.');
      return;
    }
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/filings/create-stripe-session`, {
        amount: Math.round(amount * 100), // Stripe expects amount in cents/paise
        shipment_id: form.shipment_id,
        description: `Payment for Shipment ${form.shipment_id}`
      });
      const { sessionId, publicKey } = response.data;
      const stripe = window.Stripe(publicKey);
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      alert('Failed to initiate payment: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="filing-form-container">
      <form onSubmit={handleSubmit} className="filing-form" noValidate>
        <h2>New Filing Invoice</h2>

        <fieldset>
          <legend>General Info</legend>

          <label htmlFor="shipment_id">Shipment ID *</label>
          <input
            id="shipment_id"
            name="shipment_id"
            value={form.shipment_id}
            onChange={handleChange}
            placeholder="Enter Shipment ID"
            aria-invalid={!!errors.shipment_id}
          />
          {errors.shipment_id && <small className="error">{errors.shipment_id}</small>}

          <label htmlFor="invoice_no">Invoice Number *</label>
          <input
            id="invoice_no"
            name="invoice_no"
            value={form.invoice_no}
            onChange={handleChange}
            placeholder="Enter Invoice Number"
            aria-invalid={!!errors.invoice_no}
          />
          {errors.invoice_no && <small className="error">{errors.invoice_no}</small>}

          <label htmlFor="port">Port *</label>
          <input
            id="port"
            name="port"
            value={form.port}
            onChange={handleChange}
            placeholder="Enter Port"
            aria-invalid={!!errors.port}
          />
          {errors.port && <small className="error">{errors.port}</small>}

          <label htmlFor="value">Declared Value (₹) *</label>
          <input
            id="value"
            name="value"
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={handleChange}
            placeholder="Enter Declared Value"
            aria-invalid={!!errors.value}
          />
          {errors.value && <small className="error">{errors.value}</small>}
        </fieldset>

        <fieldset>
          <legend>Items</legend>

          {form.items.map((item, idx) => (
            <div key={idx} className="item-row">
              <label htmlFor={`description_${idx}`}>Description *</label>
              <input
                id={`description_${idx}`}
                name="description"
                value={item.description}
                onChange={(e) => handleChange(e, idx)}
                placeholder="Item description"
                aria-invalid={!!errors[`desc${idx}`]}
              />
              {errors[`desc${idx}`] && <small className="error">{errors[`desc${idx}`]}</small>}

              <label htmlFor={`quantity_${idx}`}>Quantity *</label>
              <input
                id={`quantity_${idx}`}
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => handleChange(e, idx)}
                placeholder="Qty"
                aria-invalid={!!errors[`qty${idx}`]}
              />
              {errors[`qty${idx}`] && <small className="error">{errors[`qty${idx}`]}</small>}

              <label htmlFor={`price_${idx}`}>Price (₹) *</label>
              <input
                id={`price_${idx}`}
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) => handleChange(e, idx)}
                placeholder="Price"
                aria-invalid={!!errors[`price${idx}`]}
              />
              {errors[`price${idx}`] && <small className="error">{errors[`price${idx}`]}</small>}

              <div className="subtotal">
                Subtotal: ₹{itemSubtotal(item).toFixed(2)}
              </div>

              {form.items.length > 1 && (
                <button
                  type="button"
                  className="remove-item-btn"
                  aria-label={`Remove item ${idx + 1}`}
                  onClick={() => removeItem(idx)}
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addItem} className="add-item-btn">
            + Add Item
          </button>
        </fieldset>

        <div className="items-total" style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
            <QRCodeSVG value={`upi://pay?pa=sahrohitkumar10@okicici&pn=Neximp&am=${calculateItemsTotal().toFixed(2)}&cu=INR&tn=Filing+Payment+for+${form.shipment_id}`} size={90} bgColor="#fff" fgColor="#635bff" />
            <button
              type="button"
              style={{ marginTop: 16, background: '#635bff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer', width: 120 }}
              onClick={handleStripePayment}
              disabled={submitting || calculateItemsTotal() <= 0}
            >
              Pay with Stripe
            </button>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', fontWeight: 700, fontSize: '1.2rem', color: '#1a73e8' }}>
            Total Items Value: ₹{calculateItemsTotal().toFixed(2)}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="preview-invoice-btn"
            onClick={handleShowInvoice}
            disabled={submitting}
          >
            Preview Invoice
          </button>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Filing'}
          </button>
        </div>
      </form>

      {/* Invoice Preview Section */}
      {showInvoice && (
        <section className="invoice-preview">
          <h3>Invoice Preview</h3>
          <p><strong>Shipment ID:</strong> {form.shipment_id}</p>
          <p><strong>Invoice Number:</strong> {form.invoice_no}</p>
          <p><strong>Port:</strong> {form.port}</p>
          <p><strong>Declared Value:</strong> ₹{form.value}</p>

          <table className="invoice-items-table" aria-label="Invoice Items">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Price (₹)</th>
                <th>Subtotal (₹)</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{parseFloat(item.price).toFixed(2)}</td>
                  <td>{itemSubtotal(item).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                <td>₹{calculateItemsTotal().toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}
    </div>
  );
};

export default FilingForm;

/* NOTE: To enable Stripe, add this to your public/index.html before </body>:
<script src="https://js.stripe.com/v3/"></script>
*/
