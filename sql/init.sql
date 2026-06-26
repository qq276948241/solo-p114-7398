-- 面包店预订系统数据库初始化脚本

CREATE DATABASE IF NOT EXISTS bakery_booking DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bakery_booking;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
    name VARCHAR(50) COMMENT '姓名',
    role ENUM('customer', 'kitchen', 'admin') NOT NULL DEFAULT 'customer' COMMENT '角色',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_code (phone, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证码表';

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '商品名称',
    description TEXT COMMENT '商品描述',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    image VARCHAR(255) COMMENT '图片地址',
    status ENUM('on_sale', 'off_sale') NOT NULL DEFAULT 'on_sale' COMMENT '上下架状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 库存表（按日期）
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL COMMENT '商品ID',
    date DATE NOT NULL COMMENT '日期',
    total_quantity INT NOT NULL DEFAULT 0 COMMENT '总库存',
    remaining_quantity INT NOT NULL DEFAULT 0 COMMENT '剩余库存',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_product_date (product_id, date),
    INDEX idx_date (date),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存表';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
    user_id INT NOT NULL COMMENT '用户ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    pickup_date DATE NOT NULL COMMENT '取货日期',
    pickup_slot VARCHAR(20) NOT NULL COMMENT '取货时段',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
    status ENUM('pending', 'ready', 'picked') NOT NULL DEFAULT 'pending' COMMENT '订单状态：待生产/可取/已取',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_pickup_date (pickup_date),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 插入初始数据
-- 测试用户
INSERT INTO users (phone, name, role) VALUES 
('13800000001', '张顾客', 'customer'),
('13800000002', '李师傅', 'kitchen'),
('13800000000', '管理员', 'admin')
ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role);

-- 初始商品
INSERT INTO products (name, description, price, status) VALUES 
('奶香吐司', '软绵香甜，早餐必备', 12.00, 'on_sale'),
('全麦面包', '健康低脂，代餐首选', 15.00, 'on_sale'),
('牛角包', '层层酥脆，黄油香浓', 8.00, 'on_sale'),
('豆沙包', '绵软面皮，红豆香甜', 6.00, 'on_sale'),
('蒜蓉法棍', '外脆内软，蒜香浓郁', 18.00, 'off_sale')
ON DUPLICATE KEY UPDATE description=VALUES(description), price=VALUES(price), status=VALUES(status);

-- 插入未来几天的库存示例
INSERT INTO inventory (product_id, date, total_quantity, remaining_quantity) VALUES 
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 50, 50),
(2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 30, 30),
(3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 40, 40),
(4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 60, 60),
(1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 50, 50),
(2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 30, 30),
(3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 40, 40),
(4, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 60, 60)
ON DUPLICATE KEY UPDATE total_quantity=VALUES(total_quantity), remaining_quantity=VALUES(remaining_quantity);
