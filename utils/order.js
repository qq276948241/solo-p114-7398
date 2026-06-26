const { TIME_SLOTS } = require('../config');

function generateOrderNo() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function getDayAfterTomorrow() {
  const day = new Date();
  day.setDate(day.getDate() + 2);
  return day.toISOString().split('T')[0];
}

function isValidTimeSlot(slot) {
  return TIME_SLOTS.includes(slot);
}

function isBeforeCutoffTime(cutoffHour = 16) {
  const now = new Date();
  return now.getHours() < cutoffHour;
}

function getAvailablePickupDates(cutoffHour = 16) {
  const dates = [];
  if (isBeforeCutoffTime(cutoffHour)) {
    dates.push(getTomorrow());
  }
  dates.push(getDayAfterTomorrow());
  return dates;
}

module.exports = {
  generateOrderNo,
  getTomorrow,
  getDayAfterTomorrow,
  isValidTimeSlot,
  isBeforeCutoffTime,
  getAvailablePickupDates
};
