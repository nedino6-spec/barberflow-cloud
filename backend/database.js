const mysql = require('mysql2/promise');
const path = require('path');

const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'barberflow',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;
let isDbConnected = false;

async function connectDb() {
    try {
        // Primeiro tenta conectar sem banco para garantir que o banco existe
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.end();

        pool = mysql.createPool(dbConfig);
        isDbConnected = true;
        console.log(`[MySQL] Conectado ao banco: ${dbConfig.database}`);
        await initDb();
    } catch (err) {
        isDbConnected = false;
        console.error('[MySQL] Erro ao conectar:', err.message);
        console.log('Certifique-se de que o XAMPP (MySQL) está rodando.');
    }
}

connectDb();

async function initDb() {
    console.log('[MySQL] Verificando tabelas...');
    try {
        // Tabela de Clientes
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
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
        )`);

        // Tabela de Catálogo
        await pool.query(`CREATE TABLE IF NOT EXISTS services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            description TEXT,
            image_url TEXT
        )`);

        // Tabela de Configurações
        await pool.query(`CREATE TABLE IF NOT EXISTS settings (
            \`key\` VARCHAR(100) PRIMARY KEY,
            \`value\` TEXT NOT NULL
        )`);

        // Tabela de Fila
        await pool.query(`CREATE TABLE IF NOT EXISTS queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            service VARCHAR(255),
            status VARCHAR(50) DEFAULT 'waiting',
            rating INT DEFAULT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_queue_status (status),
            INDEX idx_queue_phone (phone)
        )`);

        // Tabela de Agendamentos
        await pool.query(`CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,
            service VARCHAR(255),
            scheduled_time DATETIME NOT NULL,
            status VARCHAR(50) DEFAULT 'scheduled',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabela de Estado do Bot
        await pool.query(`CREATE TABLE IF NOT EXISTS client_state (
            phone VARCHAR(20) PRIMARY KEY,
            state VARCHAR(100) NOT NULL,
            last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
            temp_data TEXT
        )`);

        // Tabela de Transações
        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_phone VARCHAR(20),
            client_name VARCHAR(255),
            service_name VARCHAR(255),
            amount DECIMAL(10, 2) NOT NULL,
            amount_paid DECIMAL(10, 2) NOT NULL,
            debt_added DECIMAL(10, 2) DEFAULT 0,
            payment_method VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('[MySQL] Tabelas prontas.');
    } catch (err) {
        console.error('[MySQL] Erro ao inicializar tabelas:', err.message);
    }
}

const dbManager = {
    // Clientes
    getClients: async () => {
        if (!isDbConnected) return [];
        try {
            const [rows] = await pool.query(`
                SELECT c.*, MAX(t.created_at) as last_visit
                FROM clients c
                LEFT JOIN transactions t ON c.phone = t.client_phone
                GROUP BY c.phone
                ORDER BY c.created_at DESC
            `);
            return rows;
        } catch (e) { return []; }
    },
    getClientByPhone: async (phone) => {
        if (!isDbConnected) return null;
        try {
            const [rows] = await pool.query("SELECT * FROM clients WHERE phone = ?", [phone]);
            return rows[0];
        } catch (e) { return null; }
    },
    createClient: async (phone, name, birth_date = '', instagram = '', address = '', observations = '') => {
        if (!isDbConnected) return null;
        try {
            const [result] = await pool.query(
                "INSERT INTO clients (phone, name, birth_date, instagram, address, observations) VALUES (?, ?, ?, ?, ?, ?)", 
                [phone, name, birth_date, instagram, address, observations]
            );
            return { id: result.insertId, phone, name, birth_date, instagram, address, observations, points: 0, blocked: 0 };
        } catch (e) { return null; }
    },
    updateClient: async (id, data) => {
        if (!isDbConnected) return 0;
        try {
            const fields = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
            const values = Object.values(data);
            const [result] = await pool.query(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    deleteClient: async (id) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("DELETE FROM clients WHERE id = ?", [id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    deleteAllClients: async () => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("DELETE FROM clients");
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    updateLastReminderDate: async (phone) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("UPDATE clients SET last_reminder_sent = NOW() WHERE phone = ?", [phone]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },

    // Catálogo
    getServices: async () => {
        if (!isDbConnected) return [];
        try {
            const [rows] = await pool.query("SELECT * FROM services");
            return rows;
        } catch (e) { return []; }
    },
    addService: async (name, price, description, image_url) => {
        if (!isDbConnected) return null;
        try {
            const [result] = await pool.query("INSERT INTO services (name, price, description, image_url) VALUES (?, ?, ?, ?)", [name, price, description, image_url]);
            return { id: result.insertId, name, price, description, image_url };
        } catch (e) { return null; }
    },
    updateService: async (id, name, price, description, image_url) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("UPDATE services SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?", [name, price, description, image_url, id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    deleteService: async (id) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("DELETE FROM services WHERE id = ?", [id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },

    // Configurações
    getSetting: async (key) => {
        if (!isDbConnected) return null;
        try {
            const [rows] = await pool.query("SELECT value FROM settings WHERE `key` = ?", [key]);
            return rows[0] ? rows[0].value : null;
        } catch (e) { return null; }
    },
    setSetting: async (key, value) => {
        if (!isDbConnected) return false;
        try {
            await pool.query(
                "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
                [key, value]
            );
            return true;
        } catch (e) { return false; }
    },

    // Fila
    addToQueue: async (phone, name, service) => {
        if (!isDbConnected) return null;
        try {
            const [result] = await pool.query('INSERT INTO queue (phone, name, service) VALUES (?, ?, ?)', [phone, name, service]);
            return { id: result.insertId, phone, name, service, status: 'waiting' };
        } catch (e) { return null; }
    },
    getQueue: async (onlyToday = false) => {
        if (!isDbConnected) return [];
        try {
            let query = `
                SELECT q.*, s.price 
                FROM queue q 
                LEFT JOIN services s ON q.service = s.name 
                WHERE q.status = 'waiting' OR q.status = 'serving'
            `;
            
            if (onlyToday) {
                query += " OR (q.status = 'completed' AND DATE(q.joined_at) = CURDATE())";
            } else {
                query += " OR q.status = 'completed'";
            }
            
            query += " ORDER BY q.joined_at ASC";
            
            const [rows] = await pool.query(query);
            return rows;
        } catch (e) { return []; }
    },
    updateQueueStatus: async (id, status) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("UPDATE queue SET status = ? WHERE id = ?", [status, id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    updateQueueRating: async (id, rating) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("UPDATE queue SET rating = ? WHERE id = ?", [rating, id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    deleteFromQueue: async (id) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("DELETE FROM queue WHERE id = ?", [id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    getQueuePosition: async (phone) => {
        if (!isDbConnected) return 0;
        try {
            const [rows] = await pool.query("SELECT phone FROM queue WHERE status = 'waiting' ORDER BY joined_at ASC");
            const pos = rows.findIndex(r => r.phone === phone);
            return pos !== -1 ? pos + 1 : 0;
        } catch (e) { return 0; }
    },

    // Bot State
    getClientState: async (phone) => {
        if (!isDbConnected) return null;
        try {
            const [rows] = await pool.query("SELECT * FROM client_state WHERE phone = ?", [phone]);
            return rows[0];
        } catch (e) { return null; }
    },
    setClientState: async (phone, state, tempData = null) => {
        if (!isDbConnected) return false;
        try {
            await pool.query(
                "INSERT INTO client_state (phone, state, temp_data, last_interaction) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE state = VALUES(state), temp_data = VALUES(temp_data), last_interaction = NOW()",
                [phone, state, tempData ? JSON.stringify(tempData) : null]
            );
            return true;
        } catch (e) { return false; }
    },
    clearClientState: async (phone) => {
        if (!isDbConnected) return false;
        try {
            await pool.query("DELETE FROM client_state WHERE phone = ?", [phone]);
            return true;
        } catch (e) { return false; }
    },

    // Agendamentos
    getAppointments: async () => {
        if (!isDbConnected) return [];
        try {
            const [rows] = await pool.query("SELECT * FROM appointments ORDER BY scheduled_time ASC");
            return rows;
        } catch (e) { return []; }
    },
    createAppointment: async (phone, name, service, scheduled_time) => {
        if (!isDbConnected) return null;
        try {
            const [result] = await pool.query(
                "INSERT INTO appointments (phone, name, service, scheduled_time) VALUES (?, ?, ?, ?)",
                [phone, name, service, scheduled_time]
            );
            return { id: result.insertId, phone, name, service, scheduled_time, status: 'scheduled' };
        } catch (e) { return null; }
    },
    updateAppointmentStatus: async (id, status) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    deleteAppointment: async (id) => {
        if (!isDbConnected) return 0;
        try {
            const [result] = await pool.query("DELETE FROM appointments WHERE id = ?", [id]);
            return result.affectedRows;
        } catch (e) { return 0; }
    },
    
    // Financeiro
    recordTransaction: async (phone, name, service, amount, paid, debt, method) => {
        if (!isDbConnected) return null;
        try {
            const [result] = await pool.query(
                "INSERT INTO transactions (client_phone, client_name, service_name, amount, amount_paid, debt_added, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [phone, name, service, amount, paid, debt, method]
            );
            return result.insertId;
        } catch (e) { return null; }
    },
    getTransactions: async (month, year) => {
        if (!isDbConnected) return [];
        try {
            let query = "SELECT * FROM transactions";
            let params = [];
            if (month && year) {
                query += " WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?";
                params = [month, year];
            }
            query += " ORDER BY created_at DESC";
            const [rows] = await pool.query(query, params);
            return rows;
        } catch (e) { return []; }
    },
    getFinancialStats: async (year) => {
        if (!isDbConnected) return [];
        try {
            const query = `
                SELECT 
                    MONTH(created_at) as month,
                    SUM(amount_paid) as total_received,
                    SUM(debt_added) as total_debt
                FROM transactions
                WHERE YEAR(created_at) = ?
                GROUP BY month
                ORDER BY month ASC
            `;
            const [rows] = await pool.query(query, [year]);
            return rows;
        } catch (e) { return []; }
    },

    getAdvancedFinancialStats: async (month, year) => {
        if (!isDbConnected) return {};
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_services,
                    AVG(amount_paid) as avg_ticket,
                    (SELECT service_name FROM transactions WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? GROUP BY service_name ORDER BY COUNT(*) DESC LIMIT 1) as top_service
                FROM transactions
                WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
            `;
            const [rows] = await pool.query(query, [month, year, month, year]);
            return rows[0];
        } catch (e) { return {}; }
    },

    // Marketing
    getRetentionClients: async (days = 30) => {
        if (!isDbConnected) return [];
        try {
            const query = `
                SELECT c.*, MAX(t.created_at) as last_visit
                FROM clients c
                LEFT JOIN transactions t ON c.phone = t.client_phone
                GROUP BY c.phone
                HAVING last_visit < DATE_SUB(NOW(), INTERVAL ? DAY) OR last_visit IS NULL
                ORDER BY last_visit ASC
            `;
            const [rows] = await pool.query(query, [days]);
            return rows;
        } catch (e) { return []; }
    },

    getLoyaltyRanking: async (limit = 10) => {
        if (!isDbConnected) return [];
        try {
            const [rows] = await pool.query("SELECT * FROM clients ORDER BY points DESC LIMIT ?", [limit]);
            return rows;
        } catch (e) { return []; }
    },

    getRecentRatings: async (limit = 20) => {
        if (!isDbConnected) return [];
        try {
            const [rows] = await pool.query("SELECT q.name, q.service, q.rating, q.joined_at FROM queue q WHERE q.rating IS NOT NULL ORDER BY q.joined_at DESC LIMIT ?", [limit]);
            return rows;
        } catch (e) { return []; }
    },
    
    getRandomWinner: async () => {
        if (!pool) return null;
        try {
            const [rows] = await pool.query("SELECT * FROM clients WHERE blocked = 0 ORDER BY RAND() LIMIT 1");
            return rows[0];
        } catch (e) { return null; }
    },
    runRaw: async (query, params = []) => {
        if (!pool) return 0;
        try {
            const [result] = await pool.query(query, params);
            return result.affectedRows;
        } catch (e) { return 0; }
    }
};

module.exports = dbManager;
