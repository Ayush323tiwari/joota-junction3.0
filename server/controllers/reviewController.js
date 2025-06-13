const Review = require('../models/Review');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Create a review
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, message, rating } = req.body;
    const userId = req.user._id;
    // Check if order exists, belongs to user, and is delivered
    const order = await Order.findOne({ _id: orderId, user: userId, status: 'delivered', 'items.product': productId });
    if (!order) {
      return res.status(403).json({ message: 'You can only review delivered products you purchased.' });
    }
    // Handle images
    const images = req.files ? req.files.map(file => `/uploads/reviews/${file.filename}`) : [];
    const review = await Review.create({
      productId,
      userId,
      orderId,
      images,
      message,
      rating
    });
    // Update product average rating
    const allReviews = await Review.find({ productId });
    const avgRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / (allReviews.length || 1);
    await Product.findByIdAndUpdate(productId, { rating: avgRating });
    res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit review', error: error.message });
  }
};

// Get all reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId }).populate('userId', 'name avatar');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
}; 