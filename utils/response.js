function success(data = null, message = 'success') {
  return {
    code: 0,
    message,
    data
  };
}

function error(message = 'error', code = 1, data = null) {
  return {
    code,
    message,
    data
  };
}

module.exports = {
  success,
  error
};
