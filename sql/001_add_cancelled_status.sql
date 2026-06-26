-- 订单表增加 cancelled 状态枚举
-- 如果已执行过 init.sql 但数据库还没有 cancelled 状态，请执行本脚本

USE bakery_booking;

ALTER TABLE orders
MODIFY COLUMN status ENUM('pending', 'ready', 'picked', 'cancelled')
NOT NULL DEFAULT 'pending'
COMMENT '订单状态：待生产/可取/已取/已取消';
