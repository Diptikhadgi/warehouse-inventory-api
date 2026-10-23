DROP DATABASE IF EXISTS warehouse;
CREATE DATABASE warehouse;
USE warehouse;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 10,
  rack_location VARCHAR(50)
);

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('IN','OUT') NOT NULL,
  qty INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO products (name, sku, quantity, min_stock, rack_location) VALUES
('Conveyor Belt', 'CB-001', 50, 10, 'A1'),
('Roller Bearing', 'RB-210', 8, 15, 'A2'),
('Pallet Jack', 'PJ-050', 22, 5, 'B1'),
('Barcode Scanner', 'BS-300', 5, 10, 'B2'),
('Servo Motor', 'SM-120', 40, 12, 'C1'),
('Proximity Sensor', 'PS-777', 75, 20, 'C2'),
('Safety Gloves', 'SG-900', 9, 25, 'D1'),
('Forklift Battery', 'FB-015', 14, 4, 'D2');

INSERT INTO stock_movements (product_id, type, qty, created_at) VALUES
(1, 'IN', 60, NOW() - INTERVAL 30 HOUR),
(1, 'OUT', 10, NOW() - INTERVAL 20 HOUR),
(2, 'OUT', 12, NOW() - INTERVAL 18 HOUR),
(4, 'OUT', 5, NOW() - INTERVAL 10 HOUR),
(6, 'IN', 30, NOW() - INTERVAL 6 HOUR),
(7, 'OUT', 16, NOW() - INTERVAL 2 HOUR);