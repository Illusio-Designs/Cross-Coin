jest.mock('../../model/reviewModel', () => ({ Review: { findAndCountAll: jest.fn() } }));
jest.mock('../../model/reviewImageModel', () => ({ ReviewImage: {} }));
jest.mock('../../model/productModel', () => ({ Product: {} }));
jest.mock('../../model/userModel', () => ({ User: {} }));
jest.mock('../../model/brandModel', () => ({}));
jest.mock('../../config/db', () => ({ sequelize: { literal: jest.fn(value => value) } }));
jest.mock('../../services/imagekitService', () => ({ getOptimizedUrl: jest.fn(value => `https://media.example.com${value}`) }));
jest.mock('../../services/cacheManager', () => ({}));
jest.mock('../../services/redisService', () => ({}));
jest.mock('../../services/reviewModerationService', () => ({}));
jest.mock('../../config/logging', () => ({ logger: { error: jest.fn() } }));
jest.mock('sequelize', () => ({ Op: {} }), { virtual: true });
jest.mock('xlsx', () => ({}), { virtual: true });

const { Review } = require('../../model/reviewModel');
const { ReviewImage } = require('../../model/reviewImageModel');
const { getAllPublicReviews } = require('../../controller/reviewController');

beforeEach(() => jest.clearAllMocks());
const response = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });

test('the default feed remains lightweight and only queries approved brand reviews', async () => {
  Review.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  const res = response();
  await getAllPublicReviews({ query: {}, brandId: 7 }, res);
  const options = Review.findAndCountAll.mock.calls[0][0];
  expect(options.where).toEqual({ status: 'approved', brandId: 7 });
  expect(options.include.some(item => item.as === 'ReviewImages')).toBe(false);
  expect(res.json.mock.calls[0][0].success).toBe(true);
});

test('photo-enabled feeds load capped photos separately and return usable URLs without multiplying the review count', async () => {
  const photo = { fileName: '/reviews/customer.jpg', fileType: 'image', toJSON: () => ({ id: 1, fileName: '/reviews/customer.jpg', fileType: 'image' }) };
  const row = { toJSON: () => ({ id: 10, review: 'Comfortable', rating: 5 }), guestName: 'Customer', ReviewImages: [photo] };
  Review.findAndCountAll.mockResolvedValue({ count: 1, rows: [row] });
  const res = response();
  await getAllPublicReviews({ query: { includeMedia: '1' }, brandId: 7 }, res);
  const media = Review.findAndCountAll.mock.calls[0][0].include.find(item => item.as === 'ReviewImages');
  expect(media).toMatchObject({ model: ReviewImage, separate: true, limit: 5 });
  const result = res.json.mock.calls[0][0];
  expect(result.pagination.total).toBe(1);
  expect(result.reviews[0].ReviewImages[0].url).toBe('https://media.example.com/reviews/customer.jpg');
});
