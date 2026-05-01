const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log(`Conectado ao banco de dados: ${dbPath}`);
        db.run("PRAGMA journal_mode = WAL");
        console.log('[Banco] Modo WAL ativado.');
        initDb();
    }
});

function initDb() {
    console.log('[Banco] Iniciando tabelas...');
    db.serialize(() => {
        // Tabela de Clientes
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            birth_date TEXT,
            instagram TEXT,
            address TEXT,
            observations TEXT,
            points INTEGER DEFAULT 0,
            blocked INTEGER DEFAULT 0,
            debt REAL DEFAULT 0,
            last_reminder_sent DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                // Tenta adicionar colunas caso a tabela já existisse
                db.run("ALTER TABLE clients ADD COLUMN birth_date TEXT", () => {});
                db.run("ALTER TABLE clients ADD COLUMN instagram TEXT", () => {});
                db.run("ALTER TABLE clients ADD COLUMN address TEXT", () => {});
                db.run("ALTER TABLE clients ADD COLUMN observations TEXT", () => {});
                db.run("ALTER TABLE clients ADD COLUMN points INTEGER DEFAULT 0", () => {});
                db.run("ALTER TABLE clients ADD COLUMN blocked INTEGER DEFAULT 0", () => {});
                db.run("ALTER TABLE clients ADD COLUMN debt REAL DEFAULT 0", () => {});
                db.run("ALTER TABLE clients ADD COLUMN last_reminder_sent DATETIME", () => {});
                
                // Índices para performance
                db.run("CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)");
            }
        });

        // Tabela de Catálogo de Serviços
        db.run(`CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            image_url TEXT
        )`, (err) => {
            if (!err) {
                db.run("ALTER TABLE services ADD COLUMN image_url TEXT", () => {});
            }
        });

        // Inserir catálogo padrão caso a tabela esteja vazia
        db.get("SELECT COUNT(*) as count FROM services", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO services (name, price, description) VALUES ('Corte Clássico', 35.00, 'Corte de cabelo tradicional ou degradê na máquina e tesoura.')");
                db.run("INSERT INTO services (name, price, description) VALUES ('Barba', 25.00, 'Modelagem de barba com navalha e toalha quente.')");
                db.run("INSERT INTO services (name, price, description) VALUES ('Corte + Barba', 55.00, 'Combo completo de cabelo e barba.')");
                db.run("INSERT INTO services (name, price, description) VALUES ('Sobrancelha', 15.00, 'Limpeza e alinhamento da sobrancelha na navalha.')");
                db.run("INSERT INTO services (name, price, description) VALUES ('Pigmentação', 30.00, 'Disfarce com tinta para preenchimento de falhas e realce.')");
            }
        });

        // Tabela de Configurações do Sistema
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);

        // Inserir configurações padrão caso vazio
        db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
            if (row && row.count === 0) {
                db.run("INSERT INTO settings (key, value) VALUES ('greeting_msg', 'Bem-vindo(a) à Barbearia Premium. Como podemos te ajudar hoje?')");
                db.run("INSERT INTO settings (key, value) VALUES ('theme_color', '#d4af37')"); // Dourado padrão
                db.run("INSERT INTO settings (key, value) VALUES ('max_queue_size', '15')");
                db.run("INSERT INTO settings (key, value) VALUES ('queue_hours', '08:00-19:00')");
                db.run("INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')");
                db.run("INSERT INTO settings (key, value) VALUES ('openai_api_key', '')");
                db.run("INSERT INTO settings (key, value) VALUES ('bot_enabled', 'true')");
            } else {
                // Garantir que as chaves existam caso a tabela já estivesse criada
                const defaultSettings = [
                    ['max_queue_size', '15'],
                    ['queue_hours', '08:00-19:00'],
                    ['admin_password', 'admin123'],
                    ['openai_api_key', ''],
                    ['bot_enabled', 'true'],
                    ['greeting_msg', 'Bem-vindo(a) à Barbearia Premium. Como podemos te ajudar hoje?'],
                    ['theme_color', '#d4af37'],
                    ['retention_days', '20'],
                    ['retention_msg', 'Olá {nome}! Notamos que você não nos visita há um tempo. Que tal agendar um horário para renovar o visual? Esperamos por você! 💈']
                ];
                
                defaultSettings.forEach(([key, value]) => {
                    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
                });
            }
        });

        // Tabela de Fila de Espera
        db.run(`CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            name TEXT NOT NULL,
            service TEXT,
            status TEXT DEFAULT 'waiting', -- waiting, serving, completed, cancelled
            rating INTEGER DEFAULT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                db.run("ALTER TABLE queue ADD COLUMN rating INTEGER DEFAULT NULL", () => {});
                // Índices para performance
                db.run("CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)");
                db.run("CREATE INDEX IF NOT EXISTS idx_queue_phone ON queue(phone)");
                db.run("CREATE INDEX IF NOT EXISTS idx_queue_joined ON queue(joined_at)");
            }
        });

        // Tabela de Agendamentos Futuros
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            name TEXT NOT NULL,
            service TEXT,
            scheduled_time DATETIME NOT NULL,
            status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabela de Estado do Cliente no Bot
        db.run(`CREATE TABLE IF NOT EXISTS client_state (
            phone TEXT PRIMARY KEY,
            state TEXT NOT NULL,
            last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
            temp_data TEXT
        )`);

        // Tabela de Transações Financeiras (Histórico)
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_phone TEXT,
            client_name TEXT,
            service_name TEXT,
            amount REAL NOT NULL,
            amount_paid REAL NOT NULL,
            debt_added REAL DEFAULT 0,
            payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

const dbManager = {
    // Clientes
    getClients: () => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, MAX(t.created_at) as last_visit
                FROM clients c
                LEFT JOIN transactions t ON c.phone = t.client_phone
                GROUP BY c.phone
                ORDER BY c.created_at DESC
            `;
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    getClientByPhone: (phone) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM clients WHERE phone = ?", [phone], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    createClient: (phone, name, birth_date = '', instagram = '', address = '', observations = '') => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO clients (phone, name, birth_date, instagram, address, observations) VALUES (?, ?, ?, ?, ?, ?)", 
                [phone, name, birth_date, instagram, address, observations], 
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, phone, name, birth_date, instagram, address, observations, points: 0, blocked: 0 });
                }
            );
        });
    },
    updateClient: (id, data) => {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
            const values = Object.values(data);
            db.run(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteClient: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM clients WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteAllClients: () => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM clients", function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    updateLastReminderDate: (phone) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE clients SET last_reminder_sent = CURRENT_TIMESTAMP WHERE phone = ?", [phone], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },

    // Catálogo
    getServices: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM services", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    addService: (name, price, description, image_url) => {
        return new Promise((resolve, reject) => {
            db.run("INSERT INTO services (name, price, description, image_url) VALUES (?, ?, ?, ?)", [name, price, description, image_url], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, price, description, image_url });
            });
        });
    },
    updateService: (id, name, price, description, image_url) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE services SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?", [name, price, description, image_url, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteService: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM services WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },

    // Configurações
    getSetting: (key) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.value : null);
            });
        });
    },
    setSetting: (key, value) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [key, value],
                function(err) {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },

    // Fila
    addToQueue: (phone, name, service) => {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO queue (phone, name, service) VALUES (?, ?, ?)', [phone, name, service], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, phone, name, service, status: 'waiting' });
            });
        });
    },
    getQueue: (onlyToday = false) => {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT q.*, s.price 
                FROM queue q 
                LEFT JOIN services s ON q.service = s.name 
                WHERE q.status = 'waiting' OR q.status = 'serving'
            `;
            
            if (onlyToday) {
                query += " OR (q.status = 'completed' AND date(q.joined_at, 'localtime') = date('now', 'localtime'))";
            } else {
                query += " OR q.status = 'completed'";
            }
            
            query += " ORDER BY q.joined_at ASC";
            
            db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    updateQueueStatus: (id, status) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE queue SET status = ? WHERE id = ?", [status, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    updateQueueRating: (id, rating) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE queue SET rating = ? WHERE id = ?", [rating, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteFromQueue: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM queue WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    getQueuePosition: (phone) => {
        return new Promise((resolve, reject) => {
            db.all("SELECT phone FROM queue WHERE status = 'waiting' ORDER BY joined_at ASC", (err, rows) => {
                if (err) reject(err);
                else {
                    const pos = rows.findIndex(r => r.phone === phone);
                    resolve(pos !== -1 ? pos + 1 : 0);
                }
            });
        });
    },

    // Bot State
    getClientState: (phone) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM client_state WHERE phone = ?", [phone], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    setClientState: (phone, state, tempData = null) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO client_state (phone, state, temp_data, last_interaction) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(phone) DO UPDATE SET state = excluded.state, temp_data = excluded.temp_data, last_interaction = CURRENT_TIMESTAMP",
                [phone, state, tempData ? JSON.stringify(tempData) : null],
                function(err) {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    },
    clearClientState: (phone) => {
         return new Promise((resolve, reject) => {
            db.run("DELETE FROM client_state WHERE phone = ?", [phone], function(err) {
                if (err) reject(err);
                else resolve(true);
            });
        });
    },

    // Agendamentos
    getAppointments: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM appointments ORDER BY scheduled_time ASC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    createAppointment: (phone, name, service, scheduled_time) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO appointments (phone, name, service, scheduled_time) VALUES (?, ?, ?, ?)",
                [phone, name, service, scheduled_time],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, phone, name, service, scheduled_time, status: 'scheduled' });
                }
            );
        });
    },
    updateAppointmentStatus: (id, status) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE appointments SET status = ? WHERE id = ?", [status, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteAppointment: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM appointments WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    
    // Financeiro / Transações
    recordTransaction: (phone, name, service, amount, paid, debt, method) => {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO transactions (client_phone, client_name, service_name, amount, amount_paid, debt_added, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [phone, name, service, amount, paid, debt, method],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },
    getTransactions: (month, year) => {
        return new Promise((resolve, reject) => {
            let query = "SELECT * FROM transactions";
            let params = [];
            if (month && year) {
                query += " WHERE strftime('%m', created_at, 'localtime') = ? AND strftime('%Y', created_at, 'localtime') = ?";
                params = [month.padStart(2, '0'), year.toString()];
            }
            query += " ORDER BY created_at DESC";
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    getFinancialStats: (year) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    strftime('%m', created_at, 'localtime') as month,
                    SUM(amount_paid) as total_received,
                    SUM(debt_added) as total_debt
                FROM transactions
                WHERE strftime('%Y', created_at, 'localtime') = ?
                GROUP BY month
                ORDER BY month ASC
            `;
            db.all(query, [year.toString()], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getAdvancedFinancialStats: (month, year) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_services,
                    AVG(amount_paid) as avg_ticket,
                    (SELECT service_name FROM transactions WHERE strftime('%m', created_at, 'localtime') = ? AND strftime('%Y', created_at, 'localtime') = ? GROUP BY service_name ORDER BY COUNT(*) DESC LIMIT 1) as top_service
                FROM transactions
                WHERE strftime('%m', created_at, 'localtime') = ? AND strftime('%Y', created_at, 'localtime') = ?
            `;
            const m = month.padStart(2, '0');
            const y = year.toString();
            db.get(query, [m, y, m, y], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Marketing e Retenção
    getRetentionClients: (days = 30) => {
        return new Promise((resolve, reject) => {
            // Clientes que não aparecem em transactions há mais de 'days' dias
            const query = `
                SELECT c.*, MAX(t.created_at) as last_visit
                FROM clients c
                LEFT JOIN transactions t ON c.phone = t.client_phone
                GROUP BY c.phone
                HAVING last_visit < date('now', '-' || ? || ' days') OR last_visit IS NULL
                ORDER BY last_visit ASC
            `;
            db.all(query, [days], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getLoyaltyRanking: (limit = 10) => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM clients ORDER BY points DESC LIMIT ?", [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getRecentRatings: (limit = 20) => {
        return new Promise((resolve, reject) => {
            db.all("SELECT q.name, q.service, q.rating, q.joined_at FROM queue q WHERE q.rating IS NOT NULL ORDER BY q.joined_at DESC LIMIT ?", [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    
    getRandomWinner: () => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM clients WHERE blocked = 0 ORDER BY RANDOM() LIMIT 1", [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    runRaw: (query, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }
};

module.exports = dbManager;
