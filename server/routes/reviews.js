const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createReview, getProductReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Multer config for multiple image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/reviews/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Create review
router.post('/', protect, upload.array('images', 5), createReview);
// Get all reviews for a product
router.get('/:productId', getProductReviews);

module.exports = router; 