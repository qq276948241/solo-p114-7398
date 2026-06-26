const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, requireAdmin, requireKitchen } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/', authenticate, productController.getProducts);
router.get('/:id', authenticate, productController.getProductDetail);
router.post('/', authenticate, requireAdmin, validate('createProduct'), productController.createProduct);
router.put('/:id', authenticate, requireAdmin, validate('updateProduct'), productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);
router.patch('/:id/status', authenticate, requireAdmin, productController.setProductStatus);
router.post('/inventory', authenticate, requireKitchen, validate('setInventory'), productController.setInventory);
router.get('/inventory/list', authenticate, requireKitchen, productController.getInventory);

module.exports = router;
