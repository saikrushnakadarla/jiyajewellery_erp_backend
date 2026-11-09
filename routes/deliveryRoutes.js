// routes/deliveryAgentRoutes.js
// Mount in your server file:
//   app.use('/', require('./routes/deliveryAgentRoutes'));
// Make sure uploads are served statically (you already do this for salesman photos):
//   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db'); // <-- adjust to your existing mysql / mysql2 connection (callback API)

const router = express.Router();

// Promise wrapper that works with mysql and mysql2 callback connections/pools
const q = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

// ---------------------------------------------------------------------------
// Photo upload
// ---------------------------------------------------------------------------
const uploadDir = path.join(__dirname, '..', 'uploads', 'delivery-agents');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(null, `da-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image files are allowed')),
});

const removeFile = (relPath) => {
  if (!relPath) return;
  const full = path.join(__dirname, '..', relPath.replace(/^\/+/, ''));
  fs.unlink(full, () => {});
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FIELDS = [
  'full_name', 'mobile_number', 'alternate_number', 'email',
  'address', 'city', 'state', 'pincode',
  'joining_date', 'employee_type',
  'id_proof_type', 'id_proof_number',
  'emergency_contact_name', 'emergency_contact_number', 'status',
];

const clean = (body) => {
  const out = {};
  FIELDS.forEach((f) => {
    let v = body[f];
    if (typeof v === 'string') v = v.trim();
    out[f] = v === '' || v === undefined || v === 'null' ? null : v;
  });
  return out;
};

const validate = (d) => {
  if (!d.full_name) return 'Full name is required.';
  if (!d.mobile_number || !/^\d{10}$/.test(d.mobile_number)) return 'Mobile number must be exactly 10 digits.';
  if (d.alternate_number && !/^\d{10}$/.test(d.alternate_number)) return 'Alternate number must be exactly 10 digits.';
  if (d.emergency_contact_number && !/^\d{10}$/.test(d.emergency_contact_number)) return 'Emergency contact must be exactly 10 digits.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Email is not valid.';
  if (d.pincode && !/^\d{6}$/.test(d.pincode)) return 'Pincode must be exactly 6 digits.';
  if (d.id_proof_number && !d.id_proof_type) return 'Select an ID proof type.';
  if (d.id_proof_type === 'Aadhaar' && d.id_proof_number && !/^\d{12}$/.test(d.id_proof_number)) return 'Aadhaar must be 12 digits.';
  if (d.id_proof_type === 'PAN' && d.id_proof_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.id_proof_number.toUpperCase())) return 'PAN format is invalid.';
  if (!['Permanent', 'Temporary', 'Contract'].includes(d.employee_type || 'Permanent')) return 'Invalid employee type.';
  if (!['Active', 'Inactive'].includes(d.status || 'Active')) return 'Invalid status.';
  return null;
};

const SELECT_COLS = `
  id, agent_code, full_name, mobile_number, alternate_number, email, profile_photo,
  address, city, state, pincode,
  DATE_FORMAT(joining_date, '%Y-%m-%d') AS joining_date,
  employee_type,
  id_proof_type, id_proof_number,
  emergency_contact_name, emergency_contact_number, status,
  created_by, created_at, updated_at`;

const mask = (v) => (v ? `${'•'.repeat(Math.max(v.length - 4, 0))}${v.slice(-4)}` : v);

// ---------------------------------------------------------------------------
// GET list  (?status=Active)  – also used by the assign-stock dropdown
// ---------------------------------------------------------------------------
router.get('/get/delivery-agents', async (req, res) => {
  try {
    const where = [];
    const params = [];
    if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }

    const rows = await q(
      `SELECT ${SELECT_COLS} FROM delivery_agents ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`,
      params
    );
    res.json(rows.map((r) => ({ ...r, id_proof_number: mask(r.id_proof_number) })));
  } catch (err) {
    console.error('GET delivery-agents:', err);
    res.status(500).json({ message: 'Failed to fetch delivery agents' });
  }
});

// ---------------------------------------------------------------------------
// GET one (full, unmasked – used by the edit form)
// ---------------------------------------------------------------------------
router.get('/get/delivery-agents/:id', async (req, res) => {
  try {
    const rows = await q(`SELECT ${SELECT_COLS} FROM delivery_agents WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Delivery agent not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET delivery-agent:', err);
    res.status(500).json({ message: 'Failed to fetch delivery agent' });
  }
});

// ---------------------------------------------------------------------------
// POST create
// ---------------------------------------------------------------------------
router.post('/delivery-agents', upload.single('profile_photo'), async (req, res) => {
  const photoPath = req.file ? `/uploads/delivery-agents/${req.file.filename}` : null;
  try {
    const d = clean(req.body);
    const error = validate(d);
    if (error) { removeFile(photoPath); return res.status(400).json({ message: error }); }

    const dup = await q('SELECT id FROM delivery_agents WHERE mobile_number = ?', [d.mobile_number]);
    if (dup.length) { removeFile(photoPath); return res.status(409).json({ message: 'This mobile number is already registered to another delivery agent.' }); }

    const createdBy = req.body.created_by ? Number(req.body.created_by) : null;
    const tempCode = `TMP${Date.now()}`;

    const result = await q(
      `INSERT INTO delivery_agents
        (agent_code, full_name, mobile_number, alternate_number, email, profile_photo,
         address, city, state, pincode, joining_date, employee_type,
         id_proof_type, id_proof_number, emergency_contact_name, emergency_contact_number, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tempCode, d.full_name, d.mobile_number, d.alternate_number, d.email, photoPath,
        d.address, d.city, d.state, d.pincode, d.joining_date, d.employee_type || 'Permanent',
        d.id_proof_type,
        d.id_proof_number ? d.id_proof_number.toUpperCase() : null,
        d.emergency_contact_name, d.emergency_contact_number, d.status || 'Active', createdBy,
      ]
    );

    // Code derived from the auto-increment id, so it can never collide
    const agentCode = `DA${String(result.insertId).padStart(3, '0')}`;
    await q('UPDATE delivery_agents SET agent_code = ? WHERE id = ?', [agentCode, result.insertId]);

    res.status(201).json({ message: 'Delivery agent created', id: result.insertId, agent_code: agentCode });
  } catch (err) {
    removeFile(photoPath);
    console.error('POST delivery-agent:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Duplicate mobile number.' });
    res.status(500).json({ message: 'Failed to create delivery agent' });
  }
});

// ---------------------------------------------------------------------------
// PUT update
// ---------------------------------------------------------------------------
router.put('/edit/delivery-agents/:id', upload.single('profile_photo'), async (req, res) => {
  const newPhoto = req.file ? `/uploads/delivery-agents/${req.file.filename}` : null;
  try {
    const existing = await q('SELECT id, profile_photo FROM delivery_agents WHERE id = ?', [req.params.id]);
    if (!existing.length) { removeFile(newPhoto); return res.status(404).json({ message: 'Delivery agent not found' }); }

    const d = clean(req.body);
    const error = validate(d);
    if (error) { removeFile(newPhoto); return res.status(400).json({ message: error }); }

    const dup = await q('SELECT id FROM delivery_agents WHERE mobile_number = ? AND id <> ?', [d.mobile_number, req.params.id]);
    if (dup.length) { removeFile(newPhoto); return res.status(409).json({ message: 'This mobile number is already registered to another delivery agent.' }); }

    // photo: new upload replaces, remove_photo=true clears, otherwise keep
    let photo = existing[0].profile_photo;
    if (newPhoto) photo = newPhoto;
    else if (req.body.remove_photo === 'true') photo = null;

    await q(
      `UPDATE delivery_agents SET
         full_name=?, mobile_number=?, alternate_number=?, email=?, profile_photo=?,
         address=?, city=?, state=?, pincode=?, joining_date=?, employee_type=?,
         id_proof_type=?, id_proof_number=?,
         emergency_contact_name=?, emergency_contact_number=?, status=?
       WHERE id=?`,
      [
        d.full_name, d.mobile_number, d.alternate_number, d.email, photo,
        d.address, d.city, d.state, d.pincode, d.joining_date, d.employee_type || 'Permanent',
        d.id_proof_type,
        d.id_proof_number ? d.id_proof_number.toUpperCase() : null,
        d.emergency_contact_name, d.emergency_contact_number, d.status || 'Active', req.params.id,
      ]
    );

    if (photo !== existing[0].profile_photo) removeFile(existing[0].profile_photo);
    res.json({ message: 'Delivery agent updated', id: Number(req.params.id) });
  } catch (err) {
    removeFile(newPhoto);
    console.error('PUT delivery-agent:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Duplicate mobile number.' });
    res.status(500).json({ message: 'Failed to update delivery agent' });
  }
});

// ---------------------------------------------------------------------------
// DELETE  (blocked if the agent already has delivery history → mark Inactive instead)
// ---------------------------------------------------------------------------
router.delete('/delete/delivery-agents/:id', async (req, res) => {
  try {
    const existing = await q('SELECT profile_photo FROM delivery_agents WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Delivery agent not found' });

    await q('DELETE FROM delivery_agents WHERE id = ?', [req.params.id]);
    removeFile(existing[0].profile_photo);
    res.json({ message: 'Delivery agent deleted' });
  } catch (err) {
    console.error('DELETE delivery-agent:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'This agent has delivery history and cannot be deleted. Mark the agent as Inactive instead.' });
    }
    res.status(500).json({ message: 'Failed to delete delivery agent' });
  }
});

// Multer / generic error handler for this router
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
  next();
});

module.exports = router;