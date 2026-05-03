-- CREATE DATABASE IF NOT EXISTS barberflow;
-- USE barberflow;

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    birth_date VARCHAR(20),
    instagram VARCHAR(100),
    address TEXT,
    observations TEXT,
    points INT DEFAULT 0,
    blocked TINYINT DEFAULT 0,
    debt DECIMAL(10, 2) DEFAULT 0,
    last_reminder_sent DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_clients_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT
) ENGINE=InnoDB;

INSERT IGNORE INTO services (id, name, price, description) VALUES 
(1, 'Corte Clássico', 35.00, 'Corte de cabelo tradicional ou degradê na máquina e tesoura.'),
(2, 'Barba', 25.00, 'Modelagem de barba com navalha e toalha quente.'),
(3, 'Corte + Barba', 55.00, 'Combo completo de cabelo e barba.'),
(4, 'Sobrancelha', 15.00, 'Limpeza e alinhamento da sobrancelha na navalha.'),
(5, 'Pigmentação', 30.00, 'Disfarce com tinta para preenchimento de falhas e realce.');

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` TEXT NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (`key`, `value`) VALUES 
('greeting_msg', 'Bem-vindo(a) à Barbearia Premium. Como podemos te ajudar hoje?'),
('theme_color', '#d4af37'),
('max_queue_size', '15'),
('queue_hours', '08:00-19:00'),
('admin_password', 'admin123'),
('openai_api_key', ''),
('bot_enabled', 'true'),
('retention_days', '20'),
('retention_msg', 'Olá {nome}! Notamos que você não nos visita há um tempo. Que tal agendar um horário para renovar o visual? Esperamos por você! 💈');

CREATE TABLE IF NOT EXISTS queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    service VARCHAR(255),
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, serving, completed, cancelled
    rating INT DEFAULT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_queue_status (status),
    INDEX idx_queue_phone (phone),
    INDEX idx_queue_joined (joined_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    service VARCHAR(255),
    scheduled_time DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS client_state (
    phone VARCHAR(20) PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    temp_data TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_phone VARCHAR(20),
    client_name VARCHAR(255),
    service_name VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    debt_added DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
