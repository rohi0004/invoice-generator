import React, { useState, useEffect } from 'react';
import { getFilings, updateFiling, deleteFiling } from '../services/filingService';
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

const FilingList = () => {
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFiling, setEditingFiling] = useState(null);

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
    </div>
  );
};

export default FilingList;
