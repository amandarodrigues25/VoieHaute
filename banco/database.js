const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./banco/ecommerce.db', (erro) => {
    if (erro) {
        console.log(erro.message);
    } else {
        console.log('Banco conectado.');
    }
});

db.serialize(() => {

    
    // ================== CLIENTES ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            nascimento TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            telefone TEXT NOT NULL,
            senha_hash TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    
    // ================== ENDEREÇOS DOS CLIENTES ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS enderecos_clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL UNIQUE,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL,
            cep TEXT NOT NULL,
            endereco TEXT NOT NULL,
            numero TEXT NOT NULL,
            complemento TEXT,
            bairro TEXT NOT NULL,
            cidade TEXT NOT NULL,
            estado TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );
    `);



    // ================== CATEGORIAS ==================

    db.run(`
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            imagem TEXT
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
            descricao TEXT,
            imagem TEXT
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
            detalhes TEXT,
            imagem TEXT,
            imagem_secundaria TEXT,
            imagem_3 TEXT,
            imagem_4 TEXT,
            video TEXT
        );
    `);

    db.run(`
    CREATE TABLE IF NOT EXISTS produto_imagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        imagem TEXT NOT NULL,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )
`,);


    // ================== ATUALIZAÇÃO PRODUTOS ==================
    // Adiciona campos novos ao banco existente sem apagar dados.

    db.all(`PRAGMA table_info(produtos)`, [], (erro, colunas) => {

        if (erro) {
            console.log(erro.message);
            return;
        }

        const nomesColunas = colunas.map(coluna => coluna.name);


        // DETALHES DA JOIA

        if (!nomesColunas.includes('detalhes')) {

            db.run(`
                ALTER TABLE produtos
                ADD COLUMN detalhes TEXT
            `, (erro) => {

                if (erro) {
                    console.log(erro.message);
                } else {
                    console.log('Coluna detalhes adicionada.');
                }

            });

        }


        // IMAGEM 3

        if (!nomesColunas.includes('imagem_3')) {

            db.run(`
                ALTER TABLE produtos
                ADD COLUMN imagem_3 TEXT
            `, (erro) => {

                if (erro) {
                    console.log(erro.message);
                } else {
                    console.log('Coluna imagem_3 adicionada.');
                }

            });

        }


        // IMAGEM 4

        if (!nomesColunas.includes('imagem_4')) {

            db.run(`
                ALTER TABLE produtos
                ADD COLUMN imagem_4 TEXT
            `, (erro) => {

                if (erro) {
                    console.log(erro.message);
                } else {
                    console.log('Coluna imagem_4 adicionada.');
                }

            });

        }

    });

});

module.exports = db;