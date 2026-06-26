# 面包店预订系统 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

## 响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code=0` 表示成功，其他表示失败
- `message` 为响应描述
- `data` 为响应数据

## 角色说明

| 角色 | 说明 |
|------|------|
| `customer` | 顾客，可下单、查询自己的订单 |
| `kitchen` | 后厨，可管理库存、查看生产清单、更新订单状态 |
| `admin` | 管理员，可管理商品、所有权限 |

---

## 一、用户登录（手机号验证码）

### 1.1 发送验证码

**POST** `/api/auth/send-code`

**请求参数**:
```json
{
  "phone": "13800000001"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "验证码已发送（模拟）：123456",
  "data": {
    "sms_sent": true
  }
}
```

### 1.2 登录

**POST** `/api/auth/login`

**请求参数**:
```json
{
  "phone": "13800000001",
  "code": "123456"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "phone": "13800000001",
      "name": "张顾客",
      "role": "customer"
    }
  }
}
```

### 1.3 获取个人信息

**GET** `/api/auth/profile`

**Header**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "phone": "13800000001",
    "name": "张顾客",
    "role": "customer",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 二、商品管理（面包种类/每日库存/上下架）

### 2.1 获取商品列表

**GET** `/api/products`

**Header**: `Authorization: Bearer <token>`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 可选，`on_sale`-在售，`off_sale`-下架 |

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "奶香吐司",
      "description": "软绵香甜，早餐必备",
      "price": 12.00,
      "image": null,
      "status": "on_sale",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2.2 获取商品详情

**GET** `/api/products/:id`

**Header**: `Authorization: Bearer <token>`

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "奶香吐司",
    "description": "软绵香甜，早餐必备",
    "price": 12.00,
    "status": "on_sale",
    "inventory": [
      {
        "date": "2024-01-02",
        "total_quantity": 50,
        "remaining_quantity": 48
      }
    ]
  }
}
```

### 2.3 创建商品 (Admin)

**POST** `/api/products`

**Header**: `Authorization: Bearer <admin_token>`

**请求参数**:
```json
{
  "name": "奶油面包",
  "description": "新鲜奶油制作",
  "price": 10.00,
  "image": "https://example.com/image.jpg",
  "status": "on_sale"
}
```

### 2.4 更新商品 (Admin)

**PUT** `/api/products/:id`

**Header**: `Authorization: Bearer <admin_token>`

**请求参数**: 同创建商品，所有字段可选

### 2.5 删除商品 (Admin)

**DELETE** `/api/products/:id`

**Header**: `Authorization: Bearer <admin_token>`

### 2.6 商品上下架 (Admin)

**PATCH** `/api/products/:id/status`

**Header**: `Authorization: Bearer <admin_token>`

**请求参数**:
```json
{
  "status": "off_sale"
}
```

### 2.7 设置每日库存 (Kitchen/Admin)

**POST** `/api/products/inventory`

**Header**: `Authorization: Bearer <kitchen_token>`

**请求参数**:
```json
{
  "product_id": 1,
  "date": "2024-01-02",
  "total_quantity": 100
}
```

### 2.8 获取库存列表 (Kitchen/Admin)

**GET** `/api/products/inventory/list`

**Header**: `Authorization: Bearer <kitchen_token>`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 可选，按日期筛选 |

---

## 三、下单（选时段数量自动扣库存超量报错）

### 3.1 创建订单

**POST** `/api/orders`

**Header**: `Authorization: Bearer <customer_token>`

**请求参数**:
```json
{
  "product_id": 1,
  "quantity": 2,
  "pickup_date": "2024-01-02",
  "pickup_slot": "08:00-09:00"
}
```

**取货时段列表**:
- 08:00-09:00
- 09:00-10:00
- 10:00-11:00
- 11:00-12:00
- 15:00-16:00
- 16:00-17:00
- 17:00-18:00
- 18:00-19:00

**规则说明**:
1. 每天 16:00 前可预订明天的面包，16:00 后只能预订后天及以后
2. 只能预订明天和后天的面包
3. 库存不足时会报错并返回剩余数量

**错误响应（库存不足）**:
```json
{
  "code": 400,
  "message": "库存不足，剩余 3 个",
  "data": {
    "remaining_quantity": 3,
    "requested_quantity": 5
  }
}
```

**成功响应**:
```json
{
  "code": 0,
  "message": "下单成功",
  "data": {
    "id": 1,
    "order_no": "202401011200001234",
    "product_id": 1,
    "product_name": "奶香吐司",
    "quantity": 2,
    "pickup_date": "2024-01-02",
    "pickup_slot": "08:00-09:00",
    "total_amount": 24.00,
    "status": "pending",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3.2 查询我的订单（顾客）

**GET** `/api/orders/my`

**Header**: `Authorization: Bearer <customer_token>`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 可选，`pending`-待生产，`ready`-可取，`picked`-已取 |

### 3.3 订单详情

**GET** `/api/orders/:id`

**Header**: `Authorization: Bearer <token>`

- 顾客只能查看自己的订单
- 后厨和管理员可查看所有订单

---

## 四、订单查询（后厨/顾客）

### 4.1 明日生产清单 (Kitchen/Admin)

**GET** `/api/orders/production`

**Header**: `Authorization: Bearer <kitchen_token>`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 可选，指定日期，默认明天 |

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "date": "2024-01-02",
    "products": [
      {
        "product_id": 1,
        "product_name": "奶香吐司",
        "price": 12.00,
        "total_quantity": 25,
        "order_count": 12,
        "orders": [
          {
            "order_id": 1,
            "order_no": "202401011200001234",
            "user_name": "张顾客",
            "user_phone": "13800000001",
            "quantity": 2,
            "pickup_slot": "08:00-09:00",
            "status": "pending"
          }
        ]
      }
    ],
    "slot_summary": [
      {
        "pickup_slot": "08:00-09:00",
        "order_count": 5,
        "total_quantity": 12
      }
    ]
  }
}
```

### 4.2 订单列表 (Kitchen/Admin)

**GET** `/api/orders/list`

**Header**: `Authorization: Bearer <kitchen_token>`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 可选，取货日期 |
| `status` | string | 可选，订单状态 |
| `user_id` | number | 可选，用户ID |

### 4.3 更新订单状态 (Kitchen/Admin)

**PATCH** `/api/orders/:id/status`

**Header**: `Authorization: Bearer <kitchen_token>`

**请求参数**:
```json
{
  "status": "ready"
}
```

**状态流转**:
- `pending` → 待生产
- `ready` → 可取
- `picked` → 已取

---

## 测试账号

| 手机号 | 角色 | 说明 |
|--------|------|------|
| 13800000001 | customer | 顾客 |
| 13800000002 | kitchen | 后厨 |
| 13800000000 | admin | 管理员 |

## 快速开始

1. 导入数据库：`mysql -u root -p < sql/init.sql`
2. 启动服务：`npm run dev`
3. 运行测试：`node test/api-test.js`

## 项目结构

```
project114/
├── app.js              # 入口文件
├── package.json
├── .env                # 环境变量
├── config/
│   ├── db.js           # 数据库连接
│   └── index.js        # 配置项
├── middleware/
│   ├── auth.js         # 认证中间件
│   ├── validate.js     # 参数校验
│   └── errorHandler.js # 错误处理
├── controllers/
│   ├── authController.js
│   ├── productController.js
│   └── orderController.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   └── orders.js
├── utils/
│   ├── response.js     # 响应工具
│   ├── sms.js          # 短信模拟
│   └── order.js        # 订单工具
├── sql/
│   └── init.sql        # 数据库初始化
└── test/
    └── api-test.js     # 自动化测试
```
