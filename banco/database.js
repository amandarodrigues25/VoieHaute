
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./banco/ecommerce.db', (erro) => {
    if (erro) {
        console.error('Erro ao conectar ao banco:', erro.message);
    } else {
        console.log('Banco conectado.');
    }
});

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function executar(sql, parametros = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, parametros, function (erro) {
            if (erro) {
                reject(erro);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function consultar(sql, parametros = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, parametros, (erro, resultado) => {
            if (erro) {
                reject(erro);
            } else {
                resolve(resultado);
            }
        });
    });
}

function consultarTodos(sql, parametros = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, parametros, (erro, resultados) => {
            if (erro) {
                reject(erro);
            } else {
                resolve(resultados);
            }
        });
    });
}

// =====================================================
// CRIAÇÃO E ATUALIZAÇÃO DO BANCO
// =====================================================

async function inicializarBanco() {

    try {

        await executar('PRAGMA foreign_keys = ON');

        // =====================================================
        // CLIENTES
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cpf TEXT NOT NULL UNIQUE,
                nascimento TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                telefone TEXT NOT NULL,
                senha_hash TEXT NOT NULL,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // =====================================================
        // ENDEREÇOS DOS CLIENTES
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS enderecos_clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                cpf TEXT NOT NULL,
                cep TEXT NOT NULL,
                endereco TEXT NOT NULL,
                numero TEXT NOT NULL,
                complemento TEXT,
                bairro TEXT NOT NULL,
                cidade TEXT NOT NULL,
                estado TEXT NOT NULL,
                principal INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id)
            )
        `);

        // Atualiza bancos antigos que ainda não têm "principal".

        const colunasEndereco = await consultarTodos(
            'PRAGMA table_info(enderecos_clientes)'
        );

        if (!colunasEndereco.some(coluna => coluna.name === 'principal')) {
            await executar(`
                ALTER TABLE enderecos_clientes
                ADD COLUMN principal INTEGER NOT NULL DEFAULT 0
            `);
        }

        // =====================================================
        // CATEGORIAS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                imagem TEXT
            )
        `);

        // =====================================================
        // MATERIAIS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS materiais (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT
            )
        `);

        // =====================================================
        // PEDRAS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS pedras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                imagem TEXT
            )
        `);

        // =====================================================
        // COLEÇÕES
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS colecoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                imagem TEXT
            )
        `);

        // =====================================================
        // TAMANHOS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS tamanhos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tamanho TEXT NOT NULL,
                descricao TEXT
            )
        `);

        // =====================================================
        // PRODUTOS
        // =====================================================

        await executar(`
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
            )
        `);

        // =====================================================
        // IMAGENS DOS PRODUTOS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS produto_imagens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                imagem TEXT NOT NULL,
                FOREIGN KEY (produto_id)
                    REFERENCES produtos(id) ON DELETE CASCADE
            )
        `);

        // =====================================================
        // ATUALIZAÇÃO DE PRODUTOS EXISTENTES
        // =====================================================

        const colunasProdutos = await consultarTodos(
            'PRAGMA table_info(produtos)'
        );

        const nomesColunas = colunasProdutos.map(coluna => coluna.name);

        const novasColunas = [
            'detalhes',
            'imagem_3',
            'imagem_4'
        ];

        for (const coluna of novasColunas) {

            if (!nomesColunas.includes(coluna)) {
                await executar(`
                    ALTER TABLE produtos
                    ADD COLUMN ${coluna} TEXT
                `);

                console.log(`Coluna ${coluna} adicionada.`);
            }
        }


        // =====================================================
        // FAVORITOS DOS CLIENTES
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                cliente_id INTEGER NOT NULL,
                produto_id INTEGER NOT NULL,

                criado_em TEXT NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (cliente_id)
                    REFERENCES clientes(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (produto_id)
                    REFERENCES produtos(id)
                    ON DELETE CASCADE,

                UNIQUE(cliente_id, produto_id)
            )
        `);

        // =====================================================
        // ÍNDICE DOS FAVORITOS
        // =====================================================

        await executar(`
            CREATE INDEX IF NOT EXISTS idx_favoritos_cliente
            ON favoritos(cliente_id)
        `);


        // =====================================================
        // PEDIDOS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,

                status TEXT NOT NULL DEFAULT 'confirmado'
                    CHECK (
                        status IN (
                            'confirmado',
                            'preparando',
                            'enviado',
                            'entregue',
                            'cancelado'
                        )
                    ),

                valor_total REAL NOT NULL DEFAULT 0,

                nome_destinatario TEXT NOT NULL,
                cep_entrega TEXT NOT NULL,
                endereco_entrega TEXT NOT NULL,
                numero_entrega TEXT NOT NULL,
                complemento_entrega TEXT,
                bairro_entrega TEXT NOT NULL,
                cidade_entrega TEXT NOT NULL,
                estado_entrega TEXT NOT NULL,

                forma_pagamento TEXT,
                pagamento_detalhes TEXT,

                criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (cliente_id)
                    REFERENCES clientes(id)
            )
        `);

        // =====================================================
        // ITENS DOS PEDIDOS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS pedido_itens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                pedido_id INTEGER NOT NULL,
                produto_id INTEGER,

                nome_produto TEXT NOT NULL,
                colecao_produto TEXT,
                imagem_produto TEXT,

                quantidade INTEGER NOT NULL DEFAULT 1
                    CHECK (quantidade > 0),

                valor_unitario REAL NOT NULL
                    CHECK (valor_unitario >= 0),

                FOREIGN KEY (pedido_id)
                    REFERENCES pedidos(id) ON DELETE CASCADE,

                FOREIGN KEY (produto_id)
                    REFERENCES produtos(id) ON DELETE SET NULL
            )
        `);

        // =====================================================
        // HISTÓRICO DOS PEDIDOS
        // =====================================================

        await executar(`
            CREATE TABLE IF NOT EXISTS pedido_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                pedido_id INTEGER NOT NULL,

                status TEXT NOT NULL
                    CHECK (
                        status IN (
                            'confirmado',
                            'preparando',
                            'enviado',
                            'entregue',
                            'cancelado'
                        )
                    ),

                data_status TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (pedido_id)
                    REFERENCES pedidos(id) ON DELETE CASCADE
            )
        `);

        // =====================================================
        // ÍNDICES
        // =====================================================

        await executar(`
            CREATE INDEX IF NOT EXISTS idx_pedidos_cliente
            ON pedidos(cliente_id)
        `);

        await executar(`
            CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_status
            ON pedidos(cliente_id, status)
        `);

        await executar(`
            CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido
            ON pedido_itens(pedido_id)
        `);

        await executar(`
            CREATE INDEX IF NOT EXISTS idx_pedido_historico_pedido
            ON pedido_historico(pedido_id)
        `);

        // =====================================================
        // PEDIDOS DEMONSTRATIVOS
        // =====================================================

        await cadastrarPedidosDemonstrativos();

        console.log('Banco de dados VoieHaute inicializado.');

    } catch (erro) {

        console.error(
            'Erro ao inicializar banco de dados:',
            erro.message
        );

        throw erro;
    }
}

// =====================================================
// CADASTRO AUTOMÁTICO DE PEDIDOS DEMONSTRATIVOS
// =====================================================

async function cadastrarPedidosDemonstrativos() {

    // Seleciona o primeiro cliente que possui endereço.
    const cliente = await consultar(`
        SELECT c.id, c.nome
        FROM clientes c
        INNER JOIN enderecos_clientes e
            ON e.cliente_id = c.id
        ORDER BY c.id ASC
        LIMIT 1
    `);

    if (!cliente) {
        console.log(
            'Pedidos demonstrativos aguardando um cliente com endereço.'
        );
        return;
    }

    const endereco = await consultar(`
        SELECT *
        FROM enderecos_clientes
        WHERE cliente_id = ?
        ORDER BY principal DESC, id ASC
        LIMIT 1
    `, [cliente.id]);

    const produtos = await consultarTodos(`
        SELECT *
        FROM produtos
        WHERE valor IS NOT NULL
          AND valor >= 0
        ORDER BY id ASC
    `);

    if (produtos.length === 0) {
        console.log(
            'Pedidos demonstrativos aguardando produtos cadastrados.'
        );
        return;
    }

    // =====================================================
    // EVITA DUPLICAR PEDIDOS DEMONSTRATIVOS
    // =====================================================

    const marcador = 'VOIEHAUTE_DEMO_2026';

    const pedidoExistente = await consultar(`
        SELECT id
        FROM pedidos
        WHERE cliente_id = ?
          AND pagamento_detalhes LIKE ?
        LIMIT 1
    `, [cliente.id, `${marcador}%`]);

    if (pedidoExistente) {
        console.log('Pedidos demonstrativos já cadastrados.');
        return;
    }

    // =====================================================
    // CINCO PEDIDOS DE EXEMPLO
    // =====================================================

    const exemplos = [
        { status: 'confirmado', dias: 1 },
        { status: 'preparando', dias: 3 },
        { status: 'enviado', dias: 5 },
        { status: 'entregue', dias: 12 },
        { status: 'cancelado', dias: 18 }
    ];

    let transacaoIniciada = false;

    try {

        await executar('BEGIN TRANSACTION');
        transacaoIniciada = true;

        for (let i = 0; i < exemplos.length; i++) {

            const exemplo = exemplos[i];
            const produto = produtos[i % produtos.length];

            const dataPedido = new Date(
                Date.now() - exemplo.dias * 86400000
            ).toISOString().slice(0, 19).replace('T', ' ');

            // =====================================================
            // CADASTRA O PEDIDO
            // =====================================================

            const pedidoId = await executar(`
                INSERT INTO pedidos (
                    cliente_id,
                    status,
                    valor_total,
                    nome_destinatario,
                    cep_entrega,
                    endereco_entrega,
                    numero_entrega,
                    complemento_entrega,
                    bairro_entrega,
                    cidade_entrega,
                    estado_entrega,
                    forma_pagamento,
                    pagamento_detalhes,
                    criado_em,
                    atualizado_em
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                cliente.id,
                exemplo.status,
                produto.valor,
                endereco.nome,
                endereco.cep,
                endereco.endereco,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.estado,
                'Pagamento simulado',
                `${marcador}_${i + 1}`,
                dataPedido,
                dataPedido
            ]);

            // =====================================================
            // CADASTRA O PRODUTO DO PEDIDO
            // =====================================================

            await executar(`
                INSERT INTO pedido_itens (
                    pedido_id,
                    produto_id,
                    nome_produto,
                    colecao_produto,
                    imagem_produto,
                    quantidade,
                    valor_unitario
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                pedidoId,
                produto.id,
                produto.nome,
                produto.colecao,
                produto.imagem,
                1,
                produto.valor
            ]);

            // =====================================================
            // HISTÓRICO DE ACOMPANHAMENTO
            // =====================================================

            const etapas = [
                'confirmado',
                'preparando',
                'enviado',
                'entregue'
            ];

            let historico;

            if (exemplo.status === 'cancelado') {

                historico = [
                    'confirmado',
                    'cancelado'
                ];

            } else {

                const indice = etapas.indexOf(exemplo.status);

                historico = etapas.slice(0, indice + 1);
            }

            for (let j = 0; j < historico.length; j++) {

                await executar(`
                    INSERT INTO pedido_historico (
                        pedido_id,
                        status,
                        data_status
                    )
                    VALUES (?, ?, datetime(?, ?))
                `, [
                    pedidoId,
                    historico[j],
                    dataPedido,
                    `+${j} days`
                ]);
            }

            console.log(
                `Pedido demonstrativo #VH${String(pedidoId).padStart(4, '0')} criado.`
            );
        }

        // =====================================================
        // CONFIRMA OS PEDIDOS
        // =====================================================

        await executar('COMMIT');
        transacaoIniciada = false;

        console.log(
            'Cinco pedidos demonstrativos cadastrados!'
        );

    } catch (erro) {

        if (transacaoIniciada) {
            try {
                await executar('ROLLBACK');
            } catch (erroRollback) {
                console.error(
                    'Erro ao desfazer transação:',
                    erroRollback.message
                );
            }
        }

        throw erro;
    }
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

const bancoPronto = inicializarBanco();

// Mantém a exportação compatível com o app.js.
module.exports = db;
module.exports.bancoPronto = bancoPronto;
