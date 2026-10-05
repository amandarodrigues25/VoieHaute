const express = require('express');
const appAdmin = express();

const db = require('../banco/database');
const upload = require('../util/imagens');


//================== ROTAS DE LOGIN / INDEX ==================//

// ABRIR LOGIN
appAdmin.get('/', (req, res) => {
    res.render('admin/login', { erro: null });
});


// VALIDAR LOGIN
appAdmin.post('/login', (req, res) => {

    const email = req.body.email;
    const senha = req.body.senha;

    if (email === 'admin@gmail.com' && senha === '123') {
        res.redirect('/admin/index');
    } else {
        res.render('admin/login', {
            erro: 'E-mail ou senha incorretos!'
        });
    }

});


// ABRIR HOME ADMIN
appAdmin.get('/index', (req, res) => {
    res.render('admin/index-admin');
});



//============================================================//
//======================= CATEGORIAS =========================//
//============================================================//


// LISTAR CATEGORIAS
appAdmin.get('/categorias', (req, res) => {

    db.all(
        'SELECT * FROM categorias',
        [],
        function (erro, categorias) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar categorias.');
            }

            res.render('admin/categorias/lista', { categorias });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/categorias/form-cadastrar', (req, res) => {
    res.render('admin/categorias/cadastro');
});


// CADASTRAR
appAdmin.post('/categorias/cadastrar', (req, res) => {

    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `INSERT INTO categorias (nome, descricao)
         VALUES (?, ?)`,
        [nome, descricao],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar categoria.');
            }

            res.redirect('/admin/categorias');
        }
    );

});


// ABRIR EDIÇÃO
appAdmin.get('/categorias/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [id],
        function (erro, categoria) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar categoria.');
            }

            res.render('admin/categorias/editar', { categoria });
        }
    );

});


// SALVAR EDIÇÃO
appAdmin.post('/categorias/editar/:id', (req, res) => {

    const id = req.params.id;
    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `UPDATE categorias
         SET nome = ?, descricao = ?
         WHERE id = ?`,
        [nome, descricao, id],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao editar categoria.');
            }

            res.redirect('/admin/categorias');
        }
    );

});


// EXCLUIR
appAdmin.get('/categorias/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM categorias WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir categoria.');
            }

            res.redirect('/admin/categorias');
        }
    );

});



//============================================================//
//======================== MATERIAIS =========================//
//============================================================//


// LISTAR MATERIAIS
appAdmin.get('/materiais', (req, res) => {

    db.all(
        'SELECT * FROM materiais',
        [],
        function (erro, materiais) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar materiais.');
            }

            res.render('admin/materiais/lista', { materiais });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/materiais/form-cadastrar', (req, res) => {
    res.render('admin/materiais/cadastro');
});


// CADASTRAR
appAdmin.post('/materiais/cadastrar', (req, res) => {

    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `INSERT INTO materiais (nome, descricao)
         VALUES (?, ?)`,
        [nome, descricao],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar material.');
            }

            res.redirect('/admin/materiais');
        }
    );

});


// ABRIR EDIÇÃO
appAdmin.get('/materiais/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM materiais WHERE id = ?',
        [id],
        function (erro, material) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar material.');
            }

            res.render('admin/materiais/editar', { material });
        }
    );

});


// SALVAR EDIÇÃO
appAdmin.post('/materiais/editar/:id', (req, res) => {

    const id = req.params.id;
    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `UPDATE materiais
         SET nome = ?, descricao = ?
         WHERE id = ?`,
        [nome, descricao, id],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao editar material.');
            }

            res.redirect('/admin/materiais');
        }
    );

});


// EXCLUIR
appAdmin.get('/materiais/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM materiais WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir material.');
            }

            res.redirect('/admin/materiais');
        }
    );

});



//============================================================//
//========================== PEDRAS ==========================//
//============================================================//


// LISTAR PEDRAS
appAdmin.get('/pedras', (req, res) => {

    db.all(
        'SELECT * FROM pedras',
        [],
        function (erro, pedras) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar pedras.');
            }

            res.render('admin/pedras/lista', { pedras });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/pedras/form-cadastrar', (req, res) => {
    res.render('admin/pedras/cadastro');
});


// CADASTRAR
appAdmin.post('/pedras/cadastrar', (req, res) => {

    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `INSERT INTO pedras (nome, descricao)
         VALUES (?, ?)`,
        [nome, descricao],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar pedra.');
            }

            res.redirect('/admin/pedras');
        }
    );

});


// ABRIR EDIÇÃO
appAdmin.get('/pedras/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM pedras WHERE id = ?',
        [id],
        function (erro, pedra) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar pedra.');
            }

            res.render('admin/pedras/editar', { pedra });
        }
    );

});


// SALVAR EDIÇÃO
appAdmin.post('/pedras/editar/:id', (req, res) => {

    const id = req.params.id;
    const nome = req.body.nome;
    const descricao = req.body.descricao;

    db.run(
        `UPDATE pedras
         SET nome = ?, descricao = ?
         WHERE id = ?`,
        [nome, descricao, id],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao editar pedra.');
            }

            res.redirect('/admin/pedras');
        }
    );

});


// EXCLUIR
appAdmin.get('/pedras/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM pedras WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir pedra.');
            }

            res.redirect('/admin/pedras');
        }
    );

});



//============================================================//
//======================== COLEÇÕES ==========================//
//============================================================//


// LISTAR COLEÇÕES
appAdmin.get('/colecoes', (req, res) => {

    db.all(
        'SELECT * FROM colecoes',
        [],
        function (erro, colecoes) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar coleções.');
            }

            res.render('admin/colecoes/lista', { colecoes });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/colecoes/form-cadastrar', (req, res) => {
    res.render('admin/colecoes/cadastro');
});


// CADASTRAR
appAdmin.post(
    '/colecoes/cadastrar',
    upload.single('imagem'),
    (req, res) => {

        const nome = req.body.nome;
        const descricao = req.body.descricao;

        let imagem = '';

        if (req.file) {
            imagem = req.file.filename;
        }

        db.run(
            `INSERT INTO colecoes (nome, descricao, imagem)
             VALUES (?, ?, ?)`,
            [nome, descricao, imagem],

            function (erro) {

                if (erro) {
                    console.log(erro.message);
                    return res.send('Erro ao cadastrar coleção.');
                }

                res.redirect('/admin/colecoes');
            }
        );

    }
);


// ABRIR EDIÇÃO
appAdmin.get('/colecoes/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM colecoes WHERE id = ?',
        [id],
        function (erro, colecao) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar coleção.');
            }

            res.render('admin/colecoes/editar', { colecao });
        }
    );

});


// SALVAR EDIÇÃO
appAdmin.post(
    '/colecoes/editar/:id',
    upload.single('imagem'),
    (req, res) => {

        const id = req.params.id;
        const nome = req.body.nome;
        const descricao = req.body.descricao;

        db.get(
            'SELECT * FROM colecoes WHERE id = ?',
            [id],
            function (erro, colecao) {

                if (erro) {
                    console.log(erro.message);
                    return res.send('Erro ao buscar coleção.');
                }

                let imagem = colecao.imagem;

                if (req.file) {
                    imagem = req.file.filename;
                }

                db.run(
                    `UPDATE colecoes
                     SET nome = ?, descricao = ?, imagem = ?
                     WHERE id = ?`,
                    [nome, descricao, imagem, id],

                    function (erro) {

                        if (erro) {
                            console.log(erro.message);
                            return res.send('Erro ao editar coleção.');
                        }

                        res.redirect('/admin/colecoes');
                    }
                );

            }
        );

    }
);


// EXCLUIR
appAdmin.get('/colecoes/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM colecoes WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir coleção.');
            }

            res.redirect('/admin/colecoes');
        }
    );

});



//============================================================//
//======================== TAMANHOS ==========================//
//============================================================//


// LISTAR TAMANHOS
appAdmin.get('/tamanhos', (req, res) => {

    db.all(
        'SELECT * FROM tamanhos',
        [],
        function (erro, tamanhos) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar tamanhos.');
            }

            res.render('admin/tamanhos/lista', { tamanhos });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/tamanhos/form-cadastrar', (req, res) => {
    res.render('admin/tamanhos/cadastro');
});


// CADASTRAR
appAdmin.post('/tamanhos/cadastrar', (req, res) => {

    const tamanho = req.body.tamanho;
    const descricao = req.body.descricao;

    db.run(
        `INSERT INTO tamanhos (tamanho, descricao)
         VALUES (?, ?)`,
        [tamanho, descricao],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao cadastrar tamanho.');
            }

            res.redirect('/admin/tamanhos');
        }
    );

});


// ABRIR EDIÇÃO
appAdmin.get('/tamanhos/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM tamanhos WHERE id = ?',
        [id],
        function (erro, tamanho) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar tamanho.');
            }

            res.render('admin/tamanhos/editar', { tamanho });
        }
    );

});


// SALVAR EDIÇÃO
appAdmin.post('/tamanhos/editar/:id', (req, res) => {

    const id = req.params.id;
    const tamanho = req.body.tamanho;
    const descricao = req.body.descricao;

    db.run(
        `UPDATE tamanhos
         SET tamanho = ?, descricao = ?
         WHERE id = ?`,
        [tamanho, descricao, id],

        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao editar tamanho.');
            }

            res.redirect('/admin/tamanhos');
        }
    );

});


// EXCLUIR
appAdmin.get('/tamanhos/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM tamanhos WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir tamanho.');
            }

            res.redirect('/admin/tamanhos');
        }
    );

});



//============================================================//
//========================= PRODUTOS =========================//
//============================================================//


// LISTAR PRODUTOS
appAdmin.get('/produtos', (req, res) => {

    db.all(
        'SELECT * FROM produtos',
        [],
        function (erro, produtos) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao consultar produtos.');
            }

            res.render('admin/produtos/lista', { produtos });
        }
    );

});


// FORMULÁRIO DE CADASTRO
appAdmin.get('/produtos/form-cadastrar', (req, res) => {

    db.all('SELECT * FROM categorias', [], function (erro, categorias) {

        if (erro) {
            return res.send('Erro ao consultar categorias.');
        }

        db.all('SELECT * FROM materiais', [], function (erro, materiais) {

            if (erro) {
                return res.send('Erro ao consultar materiais.');
            }

            db.all('SELECT * FROM pedras', [], function (erro, pedras) {

                if (erro) {
                    return res.send('Erro ao consultar pedras.');
                }

                db.all('SELECT * FROM colecoes', [], function (erro, colecoes) {

                    if (erro) {
                        return res.send('Erro ao consultar coleções.');
                    }

                    db.all('SELECT * FROM tamanhos', [], function (erro, tamanhos) {

                        if (erro) {
                            return res.send('Erro ao consultar tamanhos.');
                        }

                        res.render('admin/produtos/cadastro', {
                            categorias,
                            materiais,
                            pedras,
                            colecoes,
                            tamanhos
                        });

                    });

                });

            });

        });

    });

});


// CADASTRAR PRODUTO
appAdmin.post(
    '/produtos/cadastrar',
    upload.single('imagem'),
    (req, res) => {

        const nome = req.body.nome;
        const categoria = req.body.categoria;
        const material = req.body.material;
        const pedra = req.body.pedra;
        const colecao = req.body.colecao;
        const tamanho = req.body.tamanho;
        const valor = req.body.valor;
        const estoque = req.body.estoque;
        const descricao = req.body.descricao;

        let imagem = '';

        if (req.file) {
            imagem = req.file.filename;
        }

        db.run(
            `INSERT INTO produtos
            (
                nome,
                categoria,
                material,
                pedra,
                colecao,
                tamanho,
                valor,
                estoque,
                descricao,
                imagem
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome,
                categoria,
                material,
                pedra,
                colecao,
                tamanho,
                valor,
                estoque,
                descricao,
                imagem
            ],

            function (erro) {

                if (erro) {
                    console.log(erro.message);
                    return res.send('Erro ao cadastrar produto.');
                }

                res.redirect('/admin/produtos');
            }
        );

    }
);


// ABRIR EDIÇÃO DO PRODUTO
appAdmin.get('/produtos/editar/:id', (req, res) => {

    const id = req.params.id;

    db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id],
        function (erro, produto) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao buscar produto.');
            }

            if (!produto) {
                return res.send('Produto não encontrado.');
            }

            db.all('SELECT * FROM categorias', [], function (erro, categorias) {

                if (erro) {
                    return res.send('Erro ao consultar categorias.');
                }

                db.all('SELECT * FROM materiais', [], function (erro, materiais) {

                    if (erro) {
                        return res.send('Erro ao consultar materiais.');
                    }

                    db.all('SELECT * FROM pedras', [], function (erro, pedras) {

                        if (erro) {
                            return res.send('Erro ao consultar pedras.');
                        }

                        db.all('SELECT * FROM colecoes', [], function (erro, colecoes) {

                            if (erro) {
                                return res.send('Erro ao consultar coleções.');
                            }

                            db.all('SELECT * FROM tamanhos', [], function (erro, tamanhos) {

                                if (erro) {
                                    return res.send('Erro ao consultar tamanhos.');
                                }


                                res.render('admin/produtos/editar', {
                                    produto,
                                    categorias,
                                    materiais,
                                    pedras,
                                    colecoes,
                                    tamanhos
                                });

                            });

                        });

                    });

                });

            });

        }
    );

});


// SALVAR EDIÇÃO DO PRODUTO
appAdmin.post(
    '/produtos/editar/:id',
    upload.single('imagem'),
    (req, res) => {

        const id = req.params.id;

        const nome = req.body.nome;
        const categoria = req.body.categoria;
        const material = req.body.material;
        const pedra = req.body.pedra;
        const colecao = req.body.colecao;
        const tamanho = req.body.tamanho;
        const valor = req.body.valor;
        const estoque = req.body.estoque;
        const descricao = req.body.descricao;

        db.get(
            'SELECT * FROM produtos WHERE id = ?',
            [id],
            function (erro, produto) {

                if (erro) {
                    console.log(erro.message);
                    return res.send('Erro ao buscar produto.');
                }

                if (!produto) {
                    return res.send('Produto não encontrado.');
                }

                let imagem = produto.imagem;

                if (req.file) {
                    imagem = req.file.filename;
                }

                db.run(
                    `UPDATE produtos
                     SET nome = ?,
                         categoria = ?,
                         material = ?,
                         pedra = ?,
                         colecao = ?,
                         tamanho = ?,
                         valor = ?,
                         estoque = ?,
                         descricao = ?,
                         imagem = ?
                     WHERE id = ?`,
                    [
                        nome,
                        categoria,
                        material,
                        pedra,
                        colecao,
                        tamanho,
                        valor,
                        estoque,
                        descricao,
                        imagem,
                        id
                    ],

                    function (erro) {

                        if (erro) {
                            console.log(erro.message);
                            return res.send('Erro ao editar produto.');
                        }

                        res.redirect('/admin/produtos');
                    }
                );

            }
        );

    }
);


// EXCLUIR PRODUTO
appAdmin.get('/produtos/excluir/:id', (req, res) => {

    const id = req.params.id;

    db.run(
        'DELETE FROM produtos WHERE id = ?',
        [id],
        function (erro) {

            if (erro) {
                console.log(erro.message);
                return res.send('Erro ao excluir produto.');
            }

            res.redirect('/admin/produtos');
        }
    );

});



//================== EXPORTAÇÃO ==================//

module.exports = appAdmin;