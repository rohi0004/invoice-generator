import Filing from '../models/Filing.js';
import nodemailer from 'nodemailer';
import { Readable } from 'stream';
import QRCode from 'qrcode';

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

export const sendReceipt = async (req, res) => {
  try {
    const { type, value } = req.body;
    const filing = await Filing.findById(req.params.id);
    if (!filing) return res.status(404).json({ message: 'Filing not found' });

    // --- HTML Email Template ---
    const generateInvoiceEmailHTML = async (filing) => {
      const itemsRows = filing.items.map(item => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:right;">₹${item.price}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e3eafc;text-align:right;">₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('');
      const itemsTotal = filing.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      // Generate QR code for payment (UPI or generic)
      const qrValue = `upi://pay?pa=your-upi-id@bank&pn=Your+Business+Name&am=${filing.value}&cu=INR&tn=Filing+Payment+for+${filing.shipment_id}`;
      const qrDataUrl = await QRCode.toDataURL(qrValue);

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
            <div style="margin-top:24px;display:flex;align-items:center;gap:24px;">
              <div style="color:#1a73e8;font-weight:bold;font-size:16px;">
                Total Filing Value: ₹${filing.value}
              </div>
              <div style="text-align:center;">
                <div style="font-size:12px;color:#1a73e8;margin-bottom:2px;">Pay via UPI</div>
                <img src='${qrDataUrl}' alt='Pay QR' style='width:90px;height:90px;border-radius:8px;border:1.5px solid #1a73e8;background:#fff;' />
              </div>
            </div>
            <div style="margin-top:32px;color:#888;text-align:center;font-size:13px;">
              Thank you for your submission!
            </div>
          </div>
        </div>
      </div>
      `;
    };

    if (type === 'email') {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      });
      await transporter.verify();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: value,
        subject: 'Your Filing Receipt',
        html: await generateInvoiceEmailHTML(filing),
        text: 'Please view your filing receipt in HTML format.'
      });
      return res.json({ message: 'Receipt sent to email.' });
    } else if (type === 'mobile') {
      // --- Fast2SMS Integration with styled message ---
      const apiKey = 'mKdMUV4WMZx9XGEOOZGXMdVDWiHBThHBJ6Qo7AE59e1xGQMX01yYZTiqZxMY';
      const axios = (await import('axios')).default;
      const itemsRows = filing.items.map(item => `• ${item.description} (Qty: ${item.quantity}, ₹${item.price}) = ₹${(item.quantity * item.price).toFixed(2)}`).join('\n');
      const itemsTotal = filing.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const receiptText =
        `CUSTOMS FILING RECEIPT\n` +
        `-----------------------------\n` +
        `Filing Date: ${new Date(filing.submission_date).toLocaleString()}\n` +
        `Shipment ID: ${filing.shipment_id}\n` +
        `Invoice No: ${filing.invoice_no}\n` +
        `Port: ${filing.port}\n` +
        `Status: ${filing.status}\n` +
        `\nItems:\n${itemsRows}\n` +
        `-----------------------------\n` +
        `Total: ₹${itemsTotal.toFixed(2)}\n` +
        `Total Filing Value: ₹${filing.value}\n` +
        `\nThank you for your submission!\n` +
        `- Neximp Team`;
      const payload = {
        route: 'q',
        message: receiptText,
        language: 'english',
        flash: 0,
        numbers: value,
      };
      const headers = {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      };
      try {
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, { headers });
        if (response.data && response.data.return) {
          return res.json({ message: 'Receipt sent to mobile.' });
        } else {
          return res.status(500).json({ message: 'Failed to send SMS via Fast2SMS.' });
        }
      } catch (smsErr) {
        return res.status(500).json({ message: 'Fast2SMS error: ' + (smsErr.response?.data?.message || smsErr.message) });
      }
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadReceipt = async (req, res) => {
  try {
    const filing = await Filing.findById(req.params.id);
    if (!filing) return res.status(404).json({ message: 'Filing not found' });

    // Use the same jsPDF logic as in sendReceipt
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CUSTOMS FILING RECEIPT', 20, 20);
    doc.setFontSize(12);
    doc.text(`Shipment ID: ${filing.shipment_id}`, 20, 35);
    doc.text(`Invoice No: ${filing.invoice_no}`, 20, 45);
    doc.text(`Port: ${filing.port}`, 20, 55);
    doc.text(`Value: ₹${filing.value}`, 20, 65);
    doc.text(`Status: ${filing.status}`, 20, 75);
    doc.text(`Submission Date: ${filing.submission_date.toLocaleString()}`, 20, 85);
    doc.text('Items:', 20, 100);
    let y = 110;
    filing.items.forEach((item, idx) => {
      doc.text(
        `${idx + 1}. ${item.description} | Qty: ${item.quantity} | Price: ₹${item.price} | Subtotal: ₹${(item.quantity * item.price).toFixed(2)}`,
        20,
        y
      );
      y += 10;
    });
    doc.text(`Total: ₹${filing.items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2)}`, 20, y + 10);
    const pdfBuffer = doc.output('arraybuffer');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=filing-receipt-${filing.shipment_id}.pdf`,
    });
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
