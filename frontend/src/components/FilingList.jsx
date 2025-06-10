import React, { useState, useEffect } from 'react';
import { getFilings, updateFiling, deleteFiling, sendReceipt } from '../services/filingService';
import jsPDF from 'jspdf';
import { FaPen } from 'react-icons/fa';
import '../styles/FilingList.css';

const generatePDFReceipt = (filing) => {
  const itemsTotal = filing.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const doc = new jsPDF();
  
  const createTable = (headers, rows, startY) => {
    const cellPadding = 5;
    const colWidths = [70, 30, 30, 40];
    let yPos = startY;
    
    doc.setFont("helvetica", "bold");
    doc.setFillColor(227, 234, 255);
    doc.setTextColor(26, 115, 232);
    headers.forEach((header, i) => {
      doc.rect(20 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), yPos, colWidths[i], 10, 'F');
      doc.text(header, 20 + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + cellPadding, yPos + 7);
    });
    
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    yPos += 10;

    rows.forEach((row) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      row.forEach((cell, i) => {
        doc.text(String(cell), 20 + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + cellPadding, yPos + 7);
      });
      yPos += 10;
    });

    doc.setFont("helvetica", "bold");
    doc.setFillColor(208, 221, 255);
    doc.rect(20, yPos, colWidths.reduce((a, b) => a + b, 0), 10, 'F');
    doc.setTextColor(26, 115, 232);
    doc.text(`Total: ${itemsTotal.toFixed(2)}`, 20 + colWidths.reduce((a, b) => a + b, 0) - 40, yPos + 7);
    
    return yPos + 10;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(26, 115, 232);
  doc.text("CUSTOMS FILING RECEIPT", 105, 20, { align: "center" });
  
  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);
  
  doc.setTextColor(0);
  doc.setFontSize(12);
  
  doc.setFillColor(244, 247, 255);
  doc.rect(20, 35, 170, 50, 'F');
  
  const details = [
    [`Filing Date: ${new Date(filing.submission_date).toLocaleString()}`, 40],
    [`Shipment ID: ${filing.shipment_id}`, 48],
    [`Invoice No: ${filing.invoice_no}`, 56],
    [`Port: ${filing.port}`, 64],
    [`Status: ${filing.status}`, 72]
  ];
  
  details.forEach(([text, y]) => {
    doc.text(text, 25, y);
  });
  
  doc.setFontSize(14);
  doc.setTextColor(26, 115, 232);
  doc.text("Items Details", 20, 95);
  doc.setFontSize(12);
  
  const headers = ["Description", "Quantity", "Price", "Subtotal"];
  const rows = filing.items.map(item => [
        item.description,
        item.quantity,
        `${item.price}`,
        `${(item.quantity * item.price).toFixed(2)}`
    ]);
  
  const finalY = createTable(headers, rows, 100);
  
  doc.setFont("helvetica", "bold");
  doc.text(`Total Filing Value: ${filing.value}`, 20, finalY + 10);
  
  return doc;
};

const generateInvoiceEmailHTML = (filing) => {
  const itemsRows = filing.items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:right;">₹${item.price}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:right;">₹${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');
  const itemsTotal = filing.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#f4f7ff;padding:32px;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 4px 32px rgba(26,115,232,0.08);border:1.5px solid #1a73e8;">
      <div style="padding:32px;">
        <h2 style="color:#1a73e8;text-align:center;margin-top:0;">CUSTOMS FILING RECEIPT</h2>
        <hr style="border:0;border-top:1.5px solid #1a73e8;margin:16px 0;">
        <table style="width:100%;margin-bottom:24px;">
          <tr>
            <td style="color:#1a73e8;font-weight:bold;">Filing Date:</td>
            <td>${new Date(filing.submission_date).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="color:#1a73e8;font-weight:bold;">Shipment ID:</td>
            <td>${filing.shipment_id}</td>
          </tr>
          <tr>
            <td style="color:#1a73e8;font-weight:bold;">Invoice No:</td>
            <td>${filing.invoice_no}</td>
          </tr>
          <tr>
            <td style="color:#1a73e8;font-weight:bold;">Port:</td>
            <td>${filing.port}</td>
          </tr>
          <tr>
            <td style="color:#1a73e8;font-weight:bold;">Status:</td>
            <td>${filing.status}</td>
          </tr>
        </table>
        <h3 style="color:#1a73e8;margin-bottom:8px;">Items Details</h3>
        <table style="width:100%;border-collapse:collapse;background:#f4f7ff;">
          <thead>
            <tr style="background:#e3eaff;color:#1a73e8;">
              <th style="padding:8px 12px;text-align:left;">Description</th>
              <th style="padding:8px 12px;text-align:center;">Quantity</th>
              <th style="padding:8px 12px;text-align:right;">Price</th>
              <th style="padding:8px 12px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr style="background:#d0ddff;">
              <td colspan="3" style="padding:8px 12px;text-align:right;color:#1a73e8;font-weight:bold;">Total:</td>
              <td style="padding:8px 12px;text-align:right;color:#1a73e8;font-weight:bold;">₹${itemsTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:24px;color:#1a73e8;font-weight:bold;font-size:16px;">
          Total Filing Value: ₹${filing.value}
        </div>
        <div style="margin-top:32px;color:#888;text-align:center;font-size:13px;">
          Thank you for your submission!
        </div>
      </div>
    </div>
  </div>
  `;
};

const FilingList = () => {
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFiling, setEditingFiling] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFiling, setReceiptFiling] = useState(null);
  const [receiptOption, setReceiptOption] = useState('email');
  const [receiptValue, setReceiptValue] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const downloadReceipt = (filing) => {
    const doc = generatePDFReceipt(filing);
    doc.save(`filing-receipt-${filing.shipment_id}.pdf`);
  };

  const fetchFilings = async () => {
    try {
      const response = await getFilings();
      setFilings(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilings();
  }, []);

  const handleEdit = (filing) => {
    setEditingFiling({
      ...filing,
      items: filing.items.map(item => ({ ...item }))
    });
  };

  const handleCancelEdit = () => {
    setEditingFiling(null);
  };

  const handleUpdateField = (field, value) => {
    setEditingFiling(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setEditingFiling(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleAddItem = () => {
    setEditingFiling(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 0, price: 0 }
      ]
    }));
  };

  const handleRemoveItem = (indexToRemove) => {
    setEditingFiling(prev => ({
      ...prev,
      items: prev.items.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSave = async () => {
    try {
      await updateFiling(editingFiling._id, editingFiling);
      setEditingFiling(null);
      fetchFilings();
      alert('Filing updated successfully');
    } catch (err) {
      alert('Error updating filing: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this filing?')) {
      try {
        await deleteFiling(id);
        fetchFilings();
        alert('Filing deleted successfully');
      } catch (err) {
        alert('Error deleting filing: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const openReceiptModal = (filing) => {
    setReceiptFiling(filing);
    setShowReceiptModal(true);
    setReceiptOption('email');
    setReceiptValue('');
    setSendResult(null);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptFiling(null);
    setReceiptValue('');
    setSendResult(null);
  };

  const handleSendReceipt = async () => {
    if (!receiptValue) {
      setSendResult('Please enter a valid value.');
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      await sendReceipt(receiptFiling._id, receiptOption, receiptValue);
      setSendResult('Receipt sent successfully!');
    } catch (err) {
      setSendResult('Failed to send: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="filing-list">
      <h2>Recent Filings</h2>
      <ul>
        {filings.map(filing => (
          <li key={filing._id} className="filing-card">
            {!editingFiling?._id && (
              <FaPen
                className="edit-icon"
                title="Edit Filing"
                onClick={() => handleEdit(filing)}
              />
            )}

            {editingFiling?._id === filing._id ? (
              <div className="edit-form">
                <input
                  value={editingFiling.shipment_id}
                  onChange={(e) => handleUpdateField('shipment_id', e.target.value)}
                  placeholder="Shipment ID"
                />
                <input
                  value={editingFiling.invoice_no}
                  onChange={(e) => handleUpdateField('invoice_no', e.target.value)}
                  placeholder="Invoice No"
                />
                <input
                  value={editingFiling.port}
                  onChange={(e) => handleUpdateField('port', e.target.value)}
                  placeholder="Port"
                />
                <input
                  type="number"
                  value={editingFiling.value}
                  onChange={(e) => handleUpdateField('value', parseFloat(e.target.value))}
                  placeholder="Value"
                />
                <div className="edit-items">
                  <div className="items-header">
                    <h4>Items:</h4>
                    <button 
                      type="button" 
                      onClick={handleAddItem}
                      className="add-item-btn"
                    >
                      + Add Item
                    </button>
                  </div>
                  {editingFiling.items.map((item, idx) => (
                    <div key={idx} className="edit-item">
                      <input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                        placeholder="Quantity"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(idx, 'price', parseFloat(e.target.value))}
                        placeholder="Price"
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="remove-item-btn"
                        title="Remove Item"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-btn">Save</button>
                  <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3>Shipment ID: {filing.shipment_id}</h3>
                <p>Invoice No: {filing.invoice_no}</p>
                <p>Port: {filing.port}</p>
                <p>Value: ₹{filing.value}</p>
                <p>Status: {filing.status}</p>
                <p>Submitted: {new Date(filing.submission_date).toLocaleString()}</p>
                <details>
                  <summary>Items ({filing.items.length})</summary>
                  <ul>
                    {filing.items.map((item, idx) => (
                      <li key={idx}>
                        {item.description} - Qty: {item.quantity} - Price: ₹{item.price}
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="action-buttons">
                  <button
                    className="download-btn"
                    onClick={() => downloadReceipt(filing)}
                  >
                    Download PDF Receipt
                  </button>
                  <button
                    className="download-btn"
                    style={{ marginLeft: 10 }}
                    onClick={() => openReceiptModal(filing)}
                  >
                    Send Receipt
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(filing._id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {/* Modal for sending receipt */}
      {showReceiptModal && (
        <div className="modal-overlay" onClick={closeReceiptModal} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(26, 115, 232, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              background: '#f4f7ff',
              borderRadius: 12,
              boxShadow: '0 4px 32px rgba(26,115,232,0.18)',
              padding: 32,
              minWidth: 340,
              maxWidth: 400,
              position: 'relative',
              border: '1.5px solid #1a73e8',
              color: '#1a73e8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
            }}
          >
            <button
              className="modal-close-btn"
              onClick={closeReceiptModal}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 10,
                right: 15,
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#1a73e8',
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: 18, color: '#1a73e8', textAlign: 'center' }}>Send Receipt</h3>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
              <label style={{ color: '#1a73e8', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="receiptOption"
                  value="email"
                  checked={receiptOption === 'email'}
                  onChange={() => setReceiptOption('email')}
                  style={{ marginRight: 6 }}
                />
                Email
              </label>
              <label style={{ color: '#1a73e8', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="receiptOption"
                  value="mobile"
                  checked={receiptOption === 'mobile'}
                  onChange={() => setReceiptOption('mobile')}
                  style={{ marginRight: 6 }}
                />
                Mobile (SMS)
              </label>
            </div>
            <input
              type={receiptOption === 'email' ? 'email' : 'tel'}
              placeholder={receiptOption === 'email' ? 'Enter email address' : 'Enter mobile number'}
              value={receiptValue}
              onChange={e => setReceiptValue(e.target.value)}
              style={{
                width: '100%',
                marginBottom: 18,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #b6c7e6',
                fontSize: 16,
                color: '#1a73e8',
                background: '#fff',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleSendReceipt} disabled={sending} className="download-btn" style={{
                background: '#1a73e8',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontWeight: 600,
                fontSize: 15,
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}>
                {sending ? 'Sending...' : 'Send Receipt'}
              </button>
              <button onClick={closeReceiptModal} className="cancel-btn" style={{
                background: '#fff',
                color: '#1a73e8',
                border: '1px solid #b6c7e6',
                borderRadius: 6,
                padding: '8px 18px',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
              }}>Cancel</button>
            </div>
            {sendResult && <div style={{ marginTop: 16, color: sendResult.includes('success') ? '#188038' : '#d93025', textAlign: 'center', fontWeight: 500 }}>{sendResult}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilingList;
