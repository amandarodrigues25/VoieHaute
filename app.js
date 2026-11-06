const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

const db = require('./banco/database');


/* =====================================================
   CONFIGURAÇÕES
===================================================== */

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


/* =====================================================
   SESSÃO DO CLIENTE — SACOLA
===================================================== */

app.use(session({
    secret: process.env.SESSION_SECRET || 'voiehaute-chave-desenvolvimento',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));


/* ARQUIVOS PÚBLICOS */

app.use(express.static(path.join(__dirname, 'public')));


/* HOME DO CLIENTE */

app.get('/', (req, res) => {

     if (!req.session.clienteId) {
        return res.redirect('/cliente/login');
    }

    db.all(`
        SELECT *
        FROM produtos
        WHERE estoque > 0
        ORDER BY id DESC
    `, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/index', {
            produtos: produtos
        });

    });

});

/* =====================================================
   PÁGINA INDIVIDUAL DO PRODUTO
===================================================== */

app.get('/produto/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        `SELECT * FROM produtos WHERE id = ?`,
        [id],
        (erro, produto) => {

            if (erro) {
                console.log(erro.message);
                return res.status(500).send('Erro ao buscar produto.');
            }

            if (!produto) {
                return res.status(404).send('Produto não encontrado.');
            }

            db.all(
                `
                SELECT *
                FROM produtos
                WHERE colecao = ?
                AND id != ?
                AND estoque > 0
                ORDER BY id ASC
                `,
                [produto.colecao, produto.id],
                (erro, outrosProdutos) => {

                    if (erro) {
                        console.log(erro.message);
                        outrosProdutos = [];
                    }

                    res.render('cliente/produto', {
                        produto: produto,
                        outrosProdutos: outrosProdutos
                    });

                }
            );

        }
    );

});

/* =====================================================
   PÁGINA BUSCA DE PRODUTOS
===================================================== */

app.get('/busca', (req, res) => {

    const pesquisa = (req.query.q || '').trim();

    let sql = `
        SELECT *
        FROM produtos
        WHERE estoque > 0
    `;

    const parametros = [];

    if (pesquisa) {

        sql += `
            AND (
                nome LIKE ?
                OR categoria LIKE ?
                OR colecao LIKE ?
                OR material LIKE ?
                OR pedra LIKE ?
                OR descricao LIKE ?
            )
        `;

        const termo = `%${pesquisa}%`;

        parametros.push(
            termo,
            termo,
            termo,
            termo,
            termo,
            termo
        );
    }

    sql += ` ORDER BY id DESC`;

    db.all(sql, parametros, (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/busca', {
            produtos,
            pesquisa
        });

    });

});

app.get('/joias/aneis', (req, res) => {

    const sql = `
        SELECT
            p.*,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'modelo_categoria'
                LIMIT 1
            ) AS modelo_categoria,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'produto_categoria'
                LIMIT 1
            ) AS produto_categoria

        FROM produtos p

        WHERE p.categoria = 'Anéis'
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [], (erro, aneis) => {

        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar os anéis.');
        }

        res.render('cliente/aneis', {
            aneis
        });

    });

});


app.get('/joias/colares', (req, res) => {

    const sql = `
        SELECT
            p.*,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'modelo_categoria'
                LIMIT 1
            ) AS modelo_categoria,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'produto_categoria'
                LIMIT 1
            ) AS produto_categoria

        FROM produtos p

        WHERE p.categoria = 'Colares'
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [], (erro, colares) => {

        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar os colares.');
        }

        res.render('cliente/colares', {
            colares
        });

    });

});


app.get('/joias/pulseiras', (req, res) => {

    const sql = `
        SELECT
            p.*,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'modelo_categoria'
                LIMIT 1
            ) AS modelo_categoria,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'produto_categoria'
                LIMIT 1
            ) AS produto_categoria

        FROM produtos p

        WHERE p.categoria = 'Pulseiras'
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [], (erro, pulseiras) => {

        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar as pulseiras.');
        }

        res.render('cliente/pulseiras', {
            pulseiras
        });

    });

});

app.get('/joias/brincos', (req, res) => {

    const sql = `
        SELECT
            p.*,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'modelo_categoria'
                LIMIT 1
            ) AS modelo_categoria,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'produto_categoria'
                LIMIT 1
            ) AS produto_categoria

        FROM produtos p

        WHERE p.categoria = 'Brincos'
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [], (erro, brincos) => {

        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar os brincos.');
        }

        res.render('cliente/brincos', {
            brincos
        });

    });

});

app.get('/joias/tiaras', (req, res) => {

    const sql = `
        SELECT
            p.*,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'modelo_categoria'
                LIMIT 1
            ) AS modelo_categoria,

            (
                SELECT pi.imagem
                FROM produto_imagens pi
                WHERE pi.produto_id = p.id
                AND pi.tipo = 'produto_categoria'
                LIMIT 1
            ) AS produto_categoria

        FROM produtos p

        WHERE p.categoria = 'Tiaras'
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [], (erro, tiaras) => {

        if (erro) {
            console.log(erro.message);
            return res.send('Erro ao carregar as tiaras.');
        }

        res.render('cliente/tiaras', {
            tiaras
        });

    });

});

/* =====================================================
   COLEÇÃO L'HÉRITAGE
===================================================== */

app.get('/colecao/lheritage', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'L’Héritage'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/lheritage', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO LA COURONNE
===================================================== */

app.get('/colecao/lacouronne', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'La Couronne'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/lacouronne', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO MINUIT
===================================================== */

app.get('/colecao/minuit', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'Minuit'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/minuit', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO JARDIN DES ROIS
===================================================== */

app.get('/colecao/jardindesrois', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'Jardin des Rois'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/jardindesrois', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO PREMIÈRE LUMIÈRE
===================================================== */

app.get('/colecao/premierelumiere', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'Première Lumière'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/premierelumiere', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO LUMIÈRE DU BRÉSIL
===================================================== */

app.get('/colecao/lumieredubresil', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'Lumière du Brésil'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/lumieredubresil', {
            produtos
        });

    });

});

/* =====================================================
   COLEÇÃO VELOURS DE MINUIT
===================================================== */

app.get('/colecao/veloursdeminuit', (req, res) => {

    const sql = `
        SELECT *
        FROM produtos
        WHERE colecao = 'Velours de Minuit'
        AND estoque > 0
        ORDER BY id ASC
    `;

    db.all(sql, [], (erro, produtos) => {

        if (erro) {
            console.log(erro.message);
            produtos = [];
        }

        res.render('cliente/veloursdeminuit', {
            produtos
        });

    });

    
});

/* =====================================================
   LA MAISON
===================================================== */

app.get('/maison', (req, res) => {

    res.render('cliente/maison');

});

/* =====================================================
   ROTAS ADMIN
===================================================== */

const appAdmin = require('./rotas/admin');

console.log('TIPO DO ADMIN:', typeof appAdmin);

app.use('/admin', appAdmin);


/* =====================================================
   ROTAS DA SACOLA
===================================================== */

const appCarrinho = require('./rotas/carrinho');

app.use('/carrinho', appCarrinho);


/* =====================================================
   ROTAS DE AUTENTICAÇÃO DOS CLIENTES
===================================================== */

const clienteAuth = require('./rotas/clienteAuth');

app.use('/cliente', clienteAuth);


/* =====================================================
   PEDIDO CONFIRMADO — DEMONSTRAÇÃO
===================================================== */

appCarrinho.get('/aprovado', (req, res) => {

    if (!req.session.clienteId) {
        return res.redirect('/cliente/login');
    }

    const pedido = req.session.pedidoDemonstrativo;

    if (!pedido) {
        return res.redirect('/carrinho');
    }

    res.render('cliente/aprovado', {
        pedido
    });
});




/* =====================================================
   SERVIDOR
===================================================== */

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});