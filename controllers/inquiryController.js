const { query, memoryStore } = require('../config/db');

/**
 * @route   POST /api/inquiries
 * @desc    Submit an inquiry/contact form
 */
async function createInquiry(req, res, next) {
  try {
    const { name, phone, subject, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and message are required.'
      });
    }

    const finalSubject = subject ? subject.trim() : 'General Clinical Inquiry';

    try {
      const sql = `
        INSERT INTO inquiries (name, phone, subject, message, status)
        VALUES ($1, $2, $3, $4, 'Unread')
        RETURNING *;
      `;

      const result = await query(sql, [name.trim(), phone.trim(), finalSubject, message.trim()]);

      return res.status(201).json({
        success: true,
        message: 'Thank you! Your clinical inquiry has been submitted and recorded in PostgreSQL.',
        data: result.rows[0]
      });
    } catch (dbErr) {
      console.warn('[PostgreSQL Create Inquiry Fallback]:', dbErr.message);
      const newInquiry = {
        id: memoryStore.inquiries.length + 1,
        name: name.trim(),
        phone: phone.trim(),
        subject: finalSubject,
        message: message.trim(),
        status: 'Unread',
        created_at: new Date().toISOString()
      };
      memoryStore.inquiries.unshift(newInquiry);

      return res.status(201).json({
        success: true,
        is_demo_mode: true,
        message: 'Thank you! Your clinical inquiry has been submitted.',
        data: newInquiry
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/inquiries
 * @desc    Get all inquiries with optional status/search filters
 */
async function getAllInquiries(req, res, next) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    try {
      let conditions = [];
      let values = [];
      let paramIndex = 1;

      if (status && status !== 'all') {
        conditions.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (search) {
        conditions.push(`(
          name ILIKE $${paramIndex} OR 
          phone ILIKE $${paramIndex} OR 
          subject ILIKE $${paramIndex} OR
          message ILIKE $${paramIndex}
        )`);
        values.push(`%${search.trim()}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) FROM inquiries ${whereClause};`;
      const countResult = await query(countSql, values);
      const totalCount = parseInt(countResult.rows[0].count, 10);

      const dataSql = `
        SELECT * FROM inquiries
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `;
      values.push(parseInt(limit, 10), parseInt(offset, 10));

      const result = await query(dataSql, values);

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        total: totalCount,
        data: result.rows
      });
    } catch (dbErr) {
      console.warn('[PostgreSQL Get Inquiries Fallback]:', dbErr.message);
      let list = memoryStore.inquiries || [];
      if (status && status !== 'all') list = list.filter(i => i.status === status);
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(i => (i.name || '').toLowerCase().includes(s) || (i.message || '').toLowerCase().includes(s));
      }
      return res.status(200).json({
        success: true,
        is_demo_mode: true,
        count: list.length,
        total: list.length,
        data: list
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/inquiries/:id/status
 * @desc    Update inquiry status ('Unread', 'Read', 'Replied')
 */
async function updateInquiryStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Unread', 'Read', 'Replied'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    try {
      const sql = `
        UPDATE inquiries 
        SET status = $1 
        WHERE id = $2 
        RETURNING *;
      `;

      const result = await query(sql, [status, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Inquiry with ID ${id} not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Inquiry status updated to ${status}.`,
        data: result.rows[0]
      });
    } catch (dbErr) {
      const item = memoryStore.inquiries.find(i => String(i.id) === String(id));
      if (!item) return res.status(404).json({ success: false, message: 'Inquiry not found' });
      item.status = status;
      return res.status(200).json({ success: true, message: `Status updated to ${status}`, data: item });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/inquiries/:id
 * @desc    Delete an inquiry
 */
async function deleteInquiry(req, res, next) {
  try {
    const { id } = req.params;
    try {
      const sql = `DELETE FROM inquiries WHERE id = $1 RETURNING id;`;
      const result = await query(sql, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Inquiry with ID ${id} not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Inquiry #${id} has been deleted.`
      });
    } catch (dbErr) {
      const idx = memoryStore.inquiries.findIndex(i => String(i.id) === String(id));
      if (idx !== -1) memoryStore.inquiries.splice(idx, 1);
      return res.status(200).json({ success: true, message: `Inquiry #${id} deleted` });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry
};
