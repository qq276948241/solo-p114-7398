const Joi = require('joi');
const { error } = require('../utils/response');
const { TIME_SLOTS } = require('../config');

const schemas = {
  sendCode: Joi.object({
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
      'string.pattern.base': '请输入有效的11位手机号',
      'any.required': '手机号不能为空'
    })
  }),

  login: Joi.object({
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
      'string.pattern.base': '请输入有效的11位手机号',
      'any.required': '手机号不能为空'
    }),
    code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': '验证码必须是6位数字',
      'string.pattern.base': '验证码必须是6位数字',
      'any.required': '验证码不能为空'
    })
  }),

  createProduct: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': '商品名称至少1个字符',
      'string.max': '商品名称最多100个字符',
      'any.required': '商品名称不能为空'
    }),
    description: Joi.string().allow('').optional(),
    price: Joi.number().positive().precision(2).required().messages({
      'number.positive': '价格必须大于0',
      'any.required': '价格不能为空'
    }),
    image: Joi.string().uri().allow('').optional(),
    status: Joi.string().valid('on_sale', 'off_sale').default('on_sale')
  }),

  updateProduct: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().allow('').optional(),
    price: Joi.number().positive().precision(2).optional(),
    image: Joi.string().uri().allow('').optional(),
    status: Joi.string().valid('on_sale', 'off_sale').optional()
  }),

  setInventory: Joi.object({
    product_id: Joi.number().integer().positive().required(),
    date: Joi.date().iso().required(),
    total_quantity: Joi.number().integer().min(0).required()
  }),

  createOrder: Joi.object({
    product_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).required(),
    pickup_date: Joi.date().iso().required(),
    pickup_slot: Joi.string().valid(...TIME_SLOTS).required()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('pending', 'ready', 'picked', 'cancelled').required()
  })
};

function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json(error('校验规则不存在', 500));
    }

    const { error: validationError } = schema.validate(req.body, { abortEarly: false });
    
    if (validationError) {
      const errors = validationError.details.map(detail => detail.message);
      return res.status(400).json(error('参数校验失败', 400, { errors }));
    }

    next();
  };
}

function validateQuery(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json(error('校验规则不存在', 500));
    }

    const { error: validationError } = schema.validate(req.query, { abortEarly: false });
    
    if (validationError) {
      const errors = validationError.details.map(detail => detail.message);
      return res.status(400).json(error('参数校验失败', 400, { errors }));
    }

    next();
  };
}

module.exports = {
  validate,
  validateQuery,
  schemas
};
