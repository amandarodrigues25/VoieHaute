
const express = require('express');
const appAdmin = express();

const db = require('../banco/database');
const upload = require('../util/imagens');

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function executar(sql, parametros, res, destino, mensagem) {
    db.run(sql, parametros, function (erro) {
        if (erro) {
            console.error(erro.message);
            return res.status(500).send(mensagem);
        }
        res.redirect(destino);
    });
}

function arquivoEnviado(req, campo) {
    return req.files?.[campo]?.[0]?.filename || null;
}

// =====================================================
// LOGIN / INDEX
// =====================================================

appAdmin.get('/', (req, res) => {
    res.render('admin/login', { erro: null });
});

appAdmin.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (email === 'admin@gmail.com' && senha === '123') {
        return res.redirect('/admin/index');
    }

    res.render('admin/login', {
        erro: 'E-mail ou senha incorretos!'
    });
});

appAdmin.get('/index', (req, res) => {
    res.render('admin/index-admin');
});

// =====================================================
// CATEGORIAS
// =====================================================

appAdmin.get('/categorias', (req, res) => {
    db.all('SELECT * FROM categorias', [], (erro, categorias) => {
        if (erro) return res.status(500).send('Erro ao consultar categorias.');
        res.render('admin/categorias/lista', { categorias });
    });
});

appAdmin.get('/categorias/form-cadastrar', (req, res) => {
    res.render('admin/categorias/cadastro');
});

appAdmin.post('/categorias/cadastrar', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const imagem = req.file?.filename || null;

    executar(
        'INSERT INTO categorias (nome, descricao, imagem) VALUES (?, ?, ?)',
        [nome, descricao, imagem],
        res,
        '/admin/categorias',
        'Erro ao cadastrar categoria.'
    );
});

appAdmin.get('/categorias/editar/:id', (req, res) => {
    db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [req.params.id],
        (erro, categoria) => {
            if (erro) return res.status(500).send('Erro ao buscar categoria.');
            if (!categoria) return res.status(404).send('Categoria não encontrada.');
            res.render('admin/categorias/editar', { categoria });
        }
    );
});

appAdmin.post('/categorias/editar/:id', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const { id } = req.params;

    if (req.file) {
        executar(
            'UPDATE categorias SET nome = ?, descricao = ?, imagem = ? WHERE id = ?',
            [nome, descricao, req.file.filename, id],
            res,
            '/admin/categorias',
            'Erro ao editar categoria.'
        );
    } else {
        executar(
            'UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?',
            [nome, descricao, id],
            res,
            '/admin/categorias',
            'Erro ao editar categoria.'
        );
    }
});

appAdmin.get('/categorias/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM categorias WHERE id = ?',
        [req.params.id],
        res,
        '/admin/categorias',
        'Erro ao excluir categoria.'
    );
});

// =====================================================
// MATERIAIS
// =====================================================

appAdmin.get('/materiais', (req, res) => {
    db.all('SELECT * FROM materiais', [], (erro, materiais) => {
        if (erro) return res.status(500).send('Erro ao consultar materiais.');
        res.render('admin/materiais/lista', { materiais });
    });
});

appAdmin.get('/materiais/form-cadastrar', (req, res) => {
    res.render('admin/materiais/cadastro');
});

appAdmin.post('/materiais/cadastrar', (req, res) => {
    const { nome, descricao } = req.body;

    executar(
        'INSERT INTO materiais (nome, descricao) VALUES (?, ?)',
        [nome, descricao],
        res,
        '/admin/materiais',
        'Erro ao cadastrar material.'
    );
});

appAdmin.get('/materiais/editar/:id', (req, res) => {
    db.get(
        'SELECT * FROM materiais WHERE id = ?',
        [req.params.id],
        (erro, material) => {
            if (erro) return res.status(500).send('Erro ao buscar material.');
            if (!material) return res.status(404).send('Material não encontrado.');
            res.render('admin/materiais/editar', { material });
        }
    );
});

appAdmin.post('/materiais/editar/:id', (req, res) => {
    const { nome, descricao } = req.body;

    executar(
        'UPDATE materiais SET nome = ?, descricao = ? WHERE id = ?',
        [nome, descricao, req.params.id],
        res,
        '/admin/materiais',
        'Erro ao editar material.'
    );
});

appAdmin.get('/materiais/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM materiais WHERE id = ?',
        [req.params.id],
        res,
        '/admin/materiais',
        'Erro ao excluir material.'
    );
});

// =====================================================
// PEDRAS
// =====================================================

appAdmin.get('/pedras', (req, res) => {
    db.all('SELECT * FROM pedras', [], (erro, pedras) => {
        if (erro) return res.status(500).send('Erro ao consultar pedras.');
        res.render('admin/pedras/lista', { pedras });
    });
});

appAdmin.get('/pedras/form-cadastrar', (req, res) => {
    res.render('admin/pedras/cadastro');
});

appAdmin.post('/pedras/cadastrar', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const imagem = req.file?.filename || null;

    executar(
        'INSERT INTO pedras (nome, descricao, imagem) VALUES (?, ?, ?)',
        [nome, descricao, imagem],
        res,
        '/admin/pedras',
        'Erro ao cadastrar pedra.'
    );
});

appAdmin.get('/pedras/editar/:id', (req, res) => {
    db.get(
        'SELECT * FROM pedras WHERE id = ?',
        [req.params.id],
        (erro, pedra) => {
            if (erro) return res.status(500).send('Erro ao buscar pedra.');
            if (!pedra) return res.status(404).send('Pedra não encontrada.');
            res.render('admin/pedras/editar', { pedra });
        }
    );
});

appAdmin.post('/pedras/editar/:id', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const { id } = req.params;

    if (req.file) {
        executar(
            'UPDATE pedras SET nome = ?, descricao = ?, imagem = ? WHERE id = ?',
            [nome, descricao, req.file.filename, id],
            res,
            '/admin/pedras',
            'Erro ao editar pedra.'
        );
    } else {
        executar(
            'UPDATE pedras SET nome = ?, descricao = ? WHERE id = ?',
            [nome, descricao, id],
            res,
            '/admin/pedras',
            'Erro ao editar pedra.'
        );
    }
});

appAdmin.get('/pedras/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM pedras WHERE id = ?',
        [req.params.id],
        res,
        '/admin/pedras',
        'Erro ao excluir pedra.'
    );
});

// =====================================================
// COLEÇÕES
// =====================================================

appAdmin.get('/colecoes', (req, res) => {
    db.all('SELECT * FROM colecoes', [], (erro, colecoes) => {
        if (erro) return res.status(500).send('Erro ao consultar coleções.');
        res.render('admin/colecoes/lista', { colecoes });
    });
});

appAdmin.get('/colecoes/form-cadastrar', (req, res) => {
    res.render('admin/colecoes/cadastro');
});

appAdmin.post('/colecoes/cadastrar', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const imagem = req.file?.filename || '';

    executar(
        'INSERT INTO colecoes (nome, descricao, imagem) VALUES (?, ?, ?)',
        [nome, descricao, imagem],
        res,
        '/admin/colecoes',
        'Erro ao cadastrar coleção.'
    );
});

appAdmin.get('/colecoes/editar/:id', (req, res) => {
    db.get(
        'SELECT * FROM colecoes WHERE id = ?',
        [req.params.id],
        (erro, colecao) => {
            if (erro) return res.status(500).send('Erro ao buscar coleção.');
            if (!colecao) return res.status(404).send('Coleção não encontrada.');
            res.render('admin/colecoes/editar', { colecao });
        }
    );
});

appAdmin.post('/colecoes/editar/:id', upload.single('imagem'), (req, res) => {
    const { nome, descricao } = req.body;
    const { id } = req.params;

    db.get('SELECT * FROM colecoes WHERE id = ?', [id], (erro, colecao) => {
        if (erro) return res.status(500).send('Erro ao buscar coleção.');
        if (!colecao) return res.status(404).send('Coleção não encontrada.');

        const imagem = req.file?.filename || colecao.imagem;

        executar(
            'UPDATE colecoes SET nome = ?, descricao = ?, imagem = ? WHERE id = ?',
            [nome, descricao, imagem, id],
            res,
            '/admin/colecoes',
            'Erro ao editar coleção.'
        );
    });
});

appAdmin.get('/colecoes/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM colecoes WHERE id = ?',
        [req.params.id],
        res,
        '/admin/colecoes',
        'Erro ao excluir coleção.'
    );
});

// =====================================================
// TAMANHOS
// =====================================================

appAdmin.get('/tamanhos', (req, res) => {
    db.all('SELECT * FROM tamanhos', [], (erro, tamanhos) => {
        if (erro) return res.status(500).send('Erro ao consultar tamanhos.');
        res.render('admin/tamanhos/lista', { tamanhos });
    });
});

appAdmin.get('/tamanhos/form-cadastrar', (req, res) => {
    res.render('admin/tamanhos/cadastro');
});

appAdmin.post('/tamanhos/cadastrar', (req, res) => {
    const { tamanho, descricao } = req.body;

    executar(
        'INSERT INTO tamanhos (tamanho, descricao) VALUES (?, ?)',
        [tamanho, descricao],
        res,
        '/admin/tamanhos',
        'Erro ao cadastrar tamanho.'
    );
});

appAdmin.get('/tamanhos/editar/:id', (req, res) => {
    db.get(
        'SELECT * FROM tamanhos WHERE id = ?',
        [req.params.id],
        (erro, tamanho) => {
            if (erro) return res.status(500).send('Erro ao buscar tamanho.');
            if (!tamanho) return res.status(404).send('Tamanho não encontrado.');
            res.render('admin/tamanhos/editar', { tamanho });
        }
    );
});

appAdmin.post('/tamanhos/editar/:id', (req, res) => {
    const { tamanho, descricao } = req.body;

    executar(
        'UPDATE tamanhos SET tamanho = ?, descricao = ? WHERE id = ?',
        [tamanho, descricao, req.params.id],
        res,
        '/admin/tamanhos',
        'Erro ao editar tamanho.'
    );
});

appAdmin.get('/tamanhos/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM tamanhos WHERE id = ?',
        [req.params.id],
        res,
        '/admin/tamanhos',
        'Erro ao excluir tamanho.'
    );
});

// =====================================================
// PRODUTOS — CONFIGURAÇÃO DE UPLOADS
// =====================================================

const uploadProduto = upload.fields([
    { name: 'imagem', maxCount: 1 },
    { name: 'imagem_secundaria', maxCount: 1 },
    { name: 'imagem_3', maxCount: 1 },
    { name: 'imagem_4', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'modelo_categoria', maxCount: 1 },
    { name: 'produto_categoria', maxCount: 1 }
]);

// =====================================================
// PRODUTOS — LISTAGEM
// =====================================================

appAdmin.get('/produtos', (req, res) => {
    db.all('SELECT * FROM produtos', [], (erro, produtos) => {
        if (erro) return res.status(500).send('Erro ao consultar produtos.');
        res.render('admin/produtos/lista', { produtos });
    });
});

// =====================================================
// PRODUTOS — CARREGAR SELECTS
// =====================================================

function carregarOpcoes(callback) {
    const tabelas = [
        'categorias',
        'materiais',
        'pedras',
        'colecoes',
        'tamanhos'
    ];

    const dados = {};
    let indice = 0;

    function proxima() {
        if (indice >= tabelas.length) {
            return callback(null, dados);
        }

        const tabela = tabelas[indice++];

        db.all(`SELECT * FROM ${tabela}`, [], (erro, registros) => {
            if (erro) return callback(erro);
            dados[tabela] = registros;
            proxima();
        });
    }

    proxima();
}

// =====================================================
// PRODUTOS — FORMULÁRIO DE CADASTRO
// =====================================================

appAdmin.get('/produtos/form-cadastrar', (req, res) => {
    carregarOpcoes((erro, dados) => {
        if (erro) {
            console.error(erro.message);
            return res.status(500).send('Erro ao carregar dados do formulário.');
        }

        res.render('admin/produtos/cadastro', dados);
    });
});

// =====================================================
// PRODUTOS — CADASTRAR
// =====================================================

appAdmin.post('/produtos/cadastrar', uploadProduto, (req, res) => {
    const {
        nome,
        categoria,
        material,
        pedra,
        colecao,
        tamanho,
        valor,
        estoque,
        descricao,
        detalhes
    } = req.body;

    const imagem = arquivoEnviado(req, 'imagem') || '';
    const imagem_secundaria = arquivoEnviado(req, 'imagem_secundaria') || '';
    const imagem_3 = arquivoEnviado(req, 'imagem_3') || '';
    const imagem_4 = arquivoEnviado(req, 'imagem_4') || '';
    const video = arquivoEnviado(req, 'video') || '';

    const sql = `
        INSERT INTO produtos (
            nome, categoria, material, pedra, colecao,
            tamanho, valor, estoque, descricao, detalhes,
            imagem, imagem_secundaria, imagem_3, imagem_4, video
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
        nome, categoria, material, pedra, colecao,
        tamanho, valor, estoque, descricao, detalhes,
        imagem, imagem_secundaria, imagem_3, imagem_4, video
    ];

    db.run(sql, valores, function (erro) {
        if (erro) {
            console.error(erro.message);
            return res.status(500).send('Erro ao cadastrar produto.');
        }

        const produtoId = this.lastID;
        const modeloCategoria = arquivoEnviado(req, 'modelo_categoria');
        const produtoCategoria = arquivoEnviado(req, 'produto_categoria');

        salvarImagemCategoria(produtoId, 'modelo_categoria', modeloCategoria, (erro) => {
            if (erro) return res.status(500).send('Erro ao salvar imagem da modelo.');

            salvarImagemCategoria(produtoId, 'produto_categoria', produtoCategoria, (erro) => {
                if (erro) return res.status(500).send('Erro ao salvar imagem da joia.');

                res.redirect('/admin/produtos');
            });
        });
    });
});

// =====================================================
// PRODUTOS — IMAGENS DE CATEGORIA
// =====================================================

function salvarImagemCategoria(produtoId, tipo, imagem, callback) {
    if (!imagem) return callback(null);

    db.get(
        'SELECT id FROM produto_imagens WHERE produto_id = ? AND tipo = ?',
        [produtoId, tipo],
        (erro, existente) => {
            if (erro) return callback(erro);

            if (existente) {
                db.run(
                    'UPDATE produto_imagens SET imagem = ? WHERE id = ?',
                    [imagem, existente.id],
                    callback
                );
            } else {
                db.run(
                    'INSERT INTO produto_imagens (produto_id, tipo, imagem) VALUES (?, ?, ?)',
                    [produtoId, tipo, imagem],
                    callback
                );
            }
        }
    );
}

// =====================================================
// PRODUTOS — ABRIR EDIÇÃO
// =====================================================

appAdmin.get('/produtos/editar/:id', (req, res) => {
    const id = req.params.id;

    db.get('SELECT * FROM produtos WHERE id = ?', [id], (erro, produto) => {
        if (erro) return res.status(500).send('Erro ao buscar produto.');
        if (!produto) return res.status(404).send('Produto não encontrado.');

        carregarOpcoes((erro, dados) => {
            if (erro) return res.status(500).send('Erro ao carregar opções.');

            db.all(
                'SELECT * FROM produto_imagens WHERE produto_id = ?',
                [id],
                (erro, imagensCategoria) => {
                    if (erro) {
                        return res.status(500).send('Erro ao buscar imagens da categoria.');
                    }

                    const modeloCategoria =
                        imagensCategoria.find(i => i.tipo === 'modelo_categoria') || null;

                    const produtoCategoria =
                        imagensCategoria.find(i => i.tipo === 'produto_categoria') || null;

                    res.render('admin/produtos/editar', {
                        produto,
                        ...dados,
                        modeloCategoria,
                        produtoCategoria
                    });
                }
            );
        });
    });
});

// =====================================================
// PRODUTOS — SALVAR EDIÇÃO
// =====================================================

appAdmin.post('/produtos/editar/:id', uploadProduto, (req, res) => {
    const id = req.params.id;

    db.get('SELECT * FROM produtos WHERE id = ?', [id], (erro, produto) => {
        if (erro) return res.status(500).send('Erro ao buscar produto.');
        if (!produto) return res.status(404).send('Produto não encontrado.');

        const {
            nome,
            categoria,
            material,
            pedra,
            colecao,
            tamanho,
            valor,
            estoque,
            descricao,
            detalhes
        } = req.body;

        // Mantém arquivos antigos quando não há novo upload
        const imagem = arquivoEnviado(req, 'imagem') || produto.imagem;
        const imagem_secundaria =
            arquivoEnviado(req, 'imagem_secundaria') || produto.imagem_secundaria;
        const imagem_3 = arquivoEnviado(req, 'imagem_3') || produto.imagem_3;
        const imagem_4 = arquivoEnviado(req, 'imagem_4') || produto.imagem_4;
        const video = arquivoEnviado(req, 'video') || produto.video;

        const sql = `
            UPDATE produtos SET
                nome = ?,
                categoria = ?,
                material = ?,
                pedra = ?,
                colecao = ?,
                tamanho = ?,
                valor = ?,
                estoque = ?,
                descricao = ?,
                detalhes = ?,
                imagem = ?,
                imagem_secundaria = ?,
                imagem_3 = ?,
                imagem_4 = ?,
                video = ?
            WHERE id = ?
        `;

        const valores = [
            nome, categoria, material, pedra, colecao,
            tamanho, valor, estoque, descricao, detalhes,
            imagem, imagem_secundaria, imagem_3, imagem_4,
            video, id
        ];

        db.run(sql, valores, (erro) => {
            if (erro) {
                console.error(erro.message);
                return res.status(500).send('Erro ao editar produto.');
            }

            const modeloCategoria = arquivoEnviado(req, 'modelo_categoria');
            const produtoCategoria = arquivoEnviado(req, 'produto_categoria');

            salvarImagemCategoria(id, 'modelo_categoria', modeloCategoria, (erro) => {
                if (erro) return res.status(500).send('Erro ao salvar imagem da modelo.');

                salvarImagemCategoria(id, 'produto_categoria', produtoCategoria, (erro) => {
                    if (erro) return res.status(500).send('Erro ao salvar imagem da joia.');

                    res.redirect('/admin/produtos');
                });
            });
        });
    });
});

// =====================================================
// PRODUTOS — EXCLUIR
// =====================================================

appAdmin.get('/produtos/excluir/:id', (req, res) => {
    executar(
        'DELETE FROM produtos WHERE id = ?',
        [req.params.id],
        res,
        '/admin/produtos',
        'Erro ao excluir produto.'
    );
});

// =====================================================
// EXPORTAÇÃO DAS ROTAS ADMINISTRATIVAS
// =====================================================

module.exports = appAdmin;
