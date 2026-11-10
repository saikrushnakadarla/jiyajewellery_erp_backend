// routes/deliveryRoutes.js  (Logistic Partner Master)
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db'); // adjust to your connection

const router = express.Router();

const q = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

// ---------------- Logo upload ----------------
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
  fs.unlink(path.join(__dirname, '..', relPath.replace(/^\/+/, '')), () => {});
};

// ---------------- Helpers ----------------
const PARTNER_TYPES = ['Courier', 'Transport', '3PL', 'Local Delivery'];
const SERVICE_TYPES = ['Express', 'Standard', 'Same Day'];

const FIELDS = [
  'full_name', 'partner_type', 'contact_person', 'mobile_number', 'email',
  'address', 'city', 'state', 'pincode',
  'serviceable_areas', 'service_type', 'tracking_url_template',
  'insurance_available', 'max_declared_value', 'status',
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
  if (!d.full_name) return 'Partner name is required.';
  if (!PARTNER_TYPES.includes(d.partner_type)) return 'Select a valid partner type.';
  if (!d.contact_person) return 'Contact person is required.';
  if (!d.mobile_number || !/^\d{10}$/.test(d.mobile_number)) return 'Mobile number must be exactly 10 digits.';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Email is not valid.';
  if (!d.address) return 'Address is required.';
  if (!d.city) return 'City is required.';
  if (!d.state) return 'State is required.';
  if (!d.pincode || !/^\d{6}$/.test(d.pincode)) return 'Pincode must be exactly 6 digits.';
  if (!d.serviceable_areas) return 'Serviceable areas are required.';
  if (!d.service_type) return 'Select at least one service type.';
  if (!d.service_type.split(',').every((s) => SERVICE_TYPES.includes(s))) return 'Invalid service type.';
  if (d.tracking_url_template && !/^https?:\/\/\S+$/i.test(d.tracking_url_template)) return 'Tracking URL must start with http:// or https://';
  if (d.tracking_url_template && !d.tracking_url_template.includes('{awb}')) return 'Tracking URL must contain the {awb} placeholder.';
  if (d.max_declared_value && (isNaN(d.max_declared_value) || Number(d.max_declared_value) < 0)) return 'Max declared value must be a positive number.';
  if (!['Yes', 'No'].includes(d.insurance_available || 'No')) return 'Invalid insurance option.';
  if (!['Active', 'Inactive'].includes(d.status || 'Active')) return 'Invalid status.';
  return null;
};

const SELECT_COLS = `
  id, agent_code, full_name, partner_type, contact_person, mobile_number, email, profile_photo,
  address, city, state, pincode,
  serviceable_areas, service_type, tracking_url_template,
  insurance_available, max_declared_value,
  status, created_by, created_at, updated_at`;

const values = (d) => [
  d.full_name, d.partner_type, d.contact_person, d.mobile_number, d.email,
  d.address, d.city, d.state, d.pincode,
  d.serviceable_areas, d.service_type, d.tracking_url_template,
  d.insurance_available || 'No', d.max_declared_value, d.status || 'Active',
];

// ---------------- GET list (?status=Active) ----------------
router.get('/get/delivery-agents', async (req, res) => {
  try {
    const where = [];
    const params = [];
    if (req.query.status) { where.push('status = ?'); params.push(req.query.status); }
    const rows = await q(
      `SELECT ${SELECT_COLS} FROM delivery_agents ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET delivery-agents:', err);
    res.status(500).json({ message: 'Failed to fetch logistic partners' });
  }
});

// ---------------- GET one ----------------
router.get('/get/delivery-agents/:id', async (req, res) => {
  try {
    const rows = await q(`SELECT ${SELECT_COLS} FROM delivery_agents WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Logistic partner not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET delivery-agent:', err);
    res.status(500).json({ message: 'Failed to fetch logistic partner' });
  }
});

// ---------------- POST create ----------------
router.post('/delivery-agents', upload.single('profile_photo'), async (req, res) => {
  const photoPath = req.file ? `/uploads/delivery-agents/${req.file.filename}` : null;
  try {
    const d = clean(req.body);
    const error = validate(d);
    if (error) { removeFile(photoPath); return res.status(400).json({ message: error }); }

    const dup = await q('SELECT id FROM delivery_agents WHERE mobile_number = ?', [d.mobile_number]);
    if (dup.length) { removeFile(photoPath); return res.status(409).json({ message: 'This mobile number is already registered to another logistic partner.' }); }

    const createdBy = req.body.created_by ? Number(req.body.created_by) : null;
    const tempCode = `TMP${Date.now()}`;

    const result = await q(
      `INSERT INTO delivery_agents
        (agent_code, profile_photo, created_by,
         full_name, partner_type, contact_person, mobile_number, email,
         address, city, state, pincode,
         serviceable_areas, service_type, tracking_url_template,
         insurance_available, max_declared_value, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [tempCode, photoPath, createdBy, ...values(d)]
    );

    const agentCode = `LP${String(result.insertId).padStart(3, '0')}`;
    await q('UPDATE delivery_agents SET agent_code = ? WHERE id = ?', [agentCode, result.insertId]);

    res.status(201).json({ message: 'Logistic partner created', id: result.insertId, agent_code: agentCode });
  } catch (err) {
    removeFile(photoPath);
    console.error('POST delivery-agent:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Duplicate mobile number.' });
    res.status(500).json({ message: 'Failed to create logistic partner' });
  }
});

// ---------------- PUT update ----------------
router.put('/edit/delivery-agents/:id', upload.single('profile_photo'), async (req, res) => {
  const newPhoto = req.file ? `/uploads/delivery-agents/${req.file.filename}` : null;
  try {
    const existing = await q('SELECT id, profile_photo FROM delivery_agents WHERE id = ?', [req.params.id]);
    if (!existing.length) { removeFile(newPhoto); return res.status(404).json({ message: 'Logistic partner not found' }); }

    const d = clean(req.body);
    const error = validate(d);
    if (error) { removeFile(newPhoto); return res.status(400).json({ message: error }); }

    const dup = await q('SELECT id FROM delivery_agents WHERE mobile_number = ? AND id <> ?', [d.mobile_number, req.params.id]);
    if (dup.length) { removeFile(newPhoto); return res.status(409).json({ message: 'This mobile number is already registered to another logistic partner.' }); }

    let photo = existing[0].profile_photo;
    if (newPhoto) photo = newPhoto;
    else if (req.body.remove_photo === 'true') photo = null;

    await q(
      `UPDATE delivery_agents SET
         profile_photo=?,
         full_name=?, partner_type=?, contact_person=?, mobile_number=?, email=?,
         address=?, city=?, state=?, pincode=?,
         serviceable_areas=?, service_type=?, tracking_url_template=?,
         insurance_available=?, max_declared_value=?, status=?
       WHERE id=?`,
      [photo, ...values(d), req.params.id]
    );

    if (photo !== existing[0].profile_photo) removeFile(existing[0].profile_photo);
    res.json({ message: 'Logistic partner updated', id: Number(req.params.id) });
  } catch (err) {
    removeFile(newPhoto);
    console.error('PUT delivery-agent:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Duplicate mobile number.' });
    res.status(500).json({ message: 'Failed to update logistic partner' });
  }
});

// ---------------- DELETE ----------------
router.delete('/delete/delivery-agents/:id', async (req, res) => {
  try {
    const existing = await q('SELECT profile_photo FROM delivery_agents WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: 'Logistic partner not found' });

    await q('DELETE FROM delivery_agents WHERE id = ?', [req.params.id]);
    removeFile(existing[0].profile_photo);
    res.json({ message: 'Logistic partner deleted' });
  } catch (err) {
    console.error('DELETE delivery-agent:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ message: 'This partner has shipment history and cannot be deleted. Mark it as Inactive instead.' });
    }
    res.status(500).json({ message: 'Failed to delete logistic partner' });
  }
});

router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
  next();
});

module.exports = router;