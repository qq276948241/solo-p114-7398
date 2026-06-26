const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireKitchen } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/', authenticate, validate('createOrder'), orderController.createOrder);
router.get('/my', authenticate, orderController.getMyOrders);
router.get('/production', authenticate, requireKitchen, orderController.getProductionList);
router.get('/list', authenticate, requireKitchen, orderController.getOrders);
router.get('/:id', authenticate, orderController.getOrderDetail);
router.patch('/:id/status', authenticate, requireKitchen, validate('updateOrderStatus'), orderController.updateOrderStatus);
router.delete('/:id', authenticate, orderController.cancelOrder);

module.exports = router;
