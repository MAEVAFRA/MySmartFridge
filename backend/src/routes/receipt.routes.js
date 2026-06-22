const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const receiptController = require('../controllers/receipt.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `receipt_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Format non supporté (${file.mimetype}). Utilisez JPG, PNG ou WEBP.`));
  },
});

router.use(authMiddleware);

router.post('/scan', upload.single('image'), receiptController.scan);
router.get('/', receiptController.getAll);
router.get('/:id', receiptController.getOne);
router.delete('/:id', receiptController.delete);

module.exports = router;