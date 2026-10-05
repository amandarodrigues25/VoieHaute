const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./banco/ecommerce.db', (erro) => {
    if (erro) {
        console.log(erro.message);
    } else {
        console.log('Banco conectado.');
    }
});

db.serialize(() => {
    // ================== CATEGORIAS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT
        );
    `);

    // ================== MATERIAIS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS materiais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT
        );
    `);

     // ================== PEDRAS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS pedras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT
        );
    `);
     // ================== COLEÇÕES ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS colecoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            imagem TEXT
        );
    `);

     // ================== TAMANHOS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS tamanhos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tamanho TEXT NOT NULL,
            descricao TEXT
        );
    `);

    // ================== PRODUTOS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT,
            material TEXT,
            pedra TEXT,
            colecao TEXT,
            tamanho TEXT,
            valor FLOAT,
            estoque INTEGER DEFAULT 0,
            descricao TEXT,
            imagem TEXT
        );
    `);

});

module.exports = db;