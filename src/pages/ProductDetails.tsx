import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '../services/api';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from '../components/ui/breadcrumb';
import { ChevronRight, Home, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<number>(0);

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: () => productsAPI.getProductById(productId || '')
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5001/api/reviews/${productId}`);
      const data = await response.json();
      return data.reviews || [];
    },
    enabled: !!productId
  });

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (product) {
      addToCart({
        id: product._id || product.id || '',
        name: product.name,
        price: product.price,
        image: product.images[selectedImage] || product.images[0],
        size: selectedSize,
        brand: product.brand
      });
      toast.success('Added to cart');
    }
  };

  // Fetch related products (same category, exclude current product)
  const { data: relatedProducts = [], isLoading: relatedLoading } = useQuery<Product[]>({
    queryKey: ['relatedProducts', product?.category, product?._id],
    queryFn: () => {
      if (!product?.category) return [];
      return productsAPI.getAllProducts({ category: product.category });
    },
    enabled: !!product?.category,
    select: (products) => products.filter(p => (p._id || p.id) !== (product._id || product.id)).slice(0, 4)
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading product details. Please try again.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/brand-products/${encodeURIComponent(product.brand)}`}>
              {product.brand}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="flex flex-col gap-4 items-center">
          {/* Main Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-white flex items-center justify-center w-full max-w-md mx-auto">
            <img
              src={product.images[selectedImage]?.startsWith('/uploads/products') ? `http://localhost:5001${product.images[selectedImage]}` : product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-contain"
              style={{ maxHeight: 450, maxWidth: 450 }}
            />
          </div>
          {/* Thumbnails below main image */}
          <div className="flex gap-3 mt-4 justify-center">
            {product.images.map((img, idx) => (
              <button
                key={img + idx}
                onClick={() => setSelectedImage(idx)}
                className={`border-2 rounded-lg overflow-hidden w-20 h-20 focus:outline-none transition-all duration-200 ${
                  selectedImage === idx ? 'border-black ring-2 ring-gray-200' : 'border-gray-200 hover:border-black'
                }`}
                style={{ background: '#fff' }}
              >
                <img
                  src={img.startsWith('/uploads/products') ? `http://localhost:5001${img}` : img}
                  alt={`${product.name} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-2xl font-semibold text-gray-900 mt-2">₹{product.price}</p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-900">Size</h2>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {product.sizes.map((sizeObj) => (
                <button
                  key={sizeObj.size}
                  onClick={() => setSelectedSize(sizeObj.size.toString())}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${
                    selectedSize === sizeObj.size.toString()
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {sizeObj.size}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </Button>

          <div>
            <h2 className="text-sm font-medium text-gray-900">Shipping & Returns</h2>
            <div className="mt-2 space-y-3 text-gray-600">
              <p>Free shipping on all orders over ₹2,000. Standard delivery within 3-5 business days.</p>
              <p>Easy 30-day returns. If you're not completely satisfied with your purchase, you can return it within 30 days of delivery.</p>
              <p className="text-sm">
                <Link to="/terms" className="text-black hover:underline font-medium">
                  View our full shipping and returns policy →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Specifications & Detailed Description */}
      <div className="mt-12 bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Product Specifications</h2>
        <table className="w-full mb-6 border-t border-gray-200">
          <tbody>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Name</td>
              <td className="py-3 px-2 text-gray-600">{product.name}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Brand</td>
              <td className="py-3 px-2 text-gray-600">{product.brand}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Category</td>
              <td className="py-3 px-2 text-gray-600">{product.category}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Price</td>
              <td className="py-3 px-2 text-gray-600">₹{product.price}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Available Sizes</td>
              <td className="py-3 px-2 text-gray-600">{product.sizes.map(s => s.size).join(', ')}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Stock</td>
              <td className="py-3 px-2 text-gray-600">{product.sizes.reduce((sum, s) => sum + (s.stock || 0), 0)}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Featured</td>
              <td className="py-3 px-2 text-gray-600">{product.featured ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td className="py-3 px-2 text-gray-700 font-medium w-1/3">Rating</td>
              <td className="py-3 px-2 text-gray-600">{product.rating || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
        <h3 className="text-xl font-semibold mb-2 text-gray-900">Detailed Description</h3>
        <p className="text-gray-700 leading-relaxed text-lg">{product.description}</p>
      </div>

      {/* Product Reviews */}
      <div className="mt-12 bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Product Reviews</h2>
        {reviewsLoading ? (
          <div>Loading reviews...</div>
        ) : !reviewsData || reviewsData.length === 0 ? (
          <div className="text-gray-500">No reviews yet.</div>
        ) : (
          <div className="space-y-6">
            {reviewsData.map((review, idx) => (
              <div key={idx} className="border-b border-gray-100 pb-6 mb-6">
                <div className="flex items-center mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</div>
                    <div className="flex items-center text-yellow-500">
                      {[1,2,3,4,5].map(star => (
                        <span key={star}>{review.rating >= star ? '★' : '☆'}</span>
                      ))}
                      <span className="ml-2 text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-gray-700 mb-2">{review.message}</div>
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {review.images.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img.startsWith('/uploads/reviews') ? `http://localhost:5001${img}` : img}
                        alt="review"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      <div className="mt-12 bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Related Products</h2>
        {relatedLoading ? (
          <div>Loading related products...</div>
        ) : relatedProducts.length === 0 ? (
          <div className="text-gray-500">No related products found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((prod) => (
              <ProductCard
                key={prod._id || prod.id}
                product={prod}
                onProductClick={() => navigate(`/product/${prod._id || prod.id}`)}
                onAuthRequired={() => toast.error('Please login to add items to cart')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails; 