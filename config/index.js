require('dotenv').config();

const TIME_SLOTS = process.env.TIME_SLOTS 
  ? process.env.TIME_SLOTS.split(',') 
  : ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00'];

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret_key_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  VERIFICATION_CODE_EXPIRE_MINUTES: parseInt(process.env.VERIFICATION_CODE_EXPIRE_MINUTES) || 5,
  ORDER_CUTOFF_HOUR: parseInt(process.env.ORDER_CUTOFF_HOUR) || 16,
  TIME_SLOTS,
  ROLES: {
    CUSTOMER: 'customer',
    KITCHEN: 'kitchen',
    ADMIN: 'admin'
  },
  ORDER_STATUS: {
    PENDING: 'pending',
    READY: 'ready',
    PICKED: 'picked',
    CANCELLED: 'cancelled'
  },
  PRODUCT_STATUS: {
    ON_SALE: 'on_sale',
    OFF_SALE: 'off_sale'
  }
};
