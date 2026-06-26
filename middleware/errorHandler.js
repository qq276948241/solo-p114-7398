const { error } = require('../utils/response');

function notFoundHandler(req, res, next) {
  res.status(404).json(error('请求的资源不存在', 404, { path: req.path, method: req.method }));
}

function errorHandler(err, req, res, next) {
  console.error('错误堆栈:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json(error(err.message, 400));
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json(error('数据已存在', 400));
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json(error('关联数据不存在或无法删除', 400));
  }

  if (err.type === 'business') {
    return res.status(400).json(error(err.message, err.code || 400, err.data));
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json(error(message, statusCode, process.env.NODE_ENV === 'development' ? { stack: err.stack } : null));
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

class BusinessError extends Error {
  constructor(message, code = 400, data = null) {
    super(message);
    this.name = 'BusinessError';
    this.type = 'business';
    this.code = code;
    this.data = data;
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  BusinessError
};
