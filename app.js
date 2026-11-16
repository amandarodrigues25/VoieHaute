
const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 3000;
const db = require('./banco/database');

// =====================================================
// CONFIGURAÇÕES
// =====================================================

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =====================================================
// SESSÃO DO CLIENTE — SACOLA E LOGIN
// =====================================================

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

// =====================================================
// FOTO DE PERFIL DO CLIENTE — MULTER
// =====================================================

const pastaFotos = path.join(
    __dirname,
    'public',
    'uploads',
    'perfis'
);

fs.mkdirSync(pastaFotos, { recursive: true });

const uploadFotoPerfil = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, pastaFotos);
        },

        filename: (req, file, cb) => {
            const extensoes = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp'
            };

            const extensao = extensoes[file.mimetype];

            if (!extensao) {
                return cb(new Error('Formato de imagem inválido.'));
            }

            const nome = `perfil-${req.session.clienteId}-${Date.now()}${extensao}`;

            cb(null, nome);
        }
    }),

    limits: {
        fileSize: 3 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const permitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!permitidos.includes(file.mimetype)) {
            return cb(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
        }

        cb(null, true);
    }
});

// =====================================================
// BANCO DE DADOS — COLUNA FOTO
// =====================================================

db.all('PRAGMA table_info(clientes)', [], (erro, colunas) => {
    if (erro) {
        console.error(
            'Erro ao verificar tabela clientes:',
            erro.message
        );
        return;
    }

    const existeFoto = colunas.some(
        coluna => coluna.name === 'foto'
    );

    if (!existeFoto) {
        db.run(
            'ALTER TABLE clientes ADD COLUMN foto TEXT',
            erro => {
                if (erro) {
                    console.error(
                        'Erro ao adicionar coluna foto:',
                        erro.message
                    );
                }
            }
        );
    }
});

// =====================================================
// ARQUIVOS PÚBLICOS
// =====================================================

app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// EXIGIR LOGIN
// =====================================================

function exigirLogin(req, res, next) {
    if (req.session.clienteId) {
        return next();
    }

    req.session.retornoAposLogin = req.originalUrl;

    req.session.save((erro) => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao preparar o login.'
            );
        }

        res.redirect('/cliente/login');
    });
}


 // =====================================================
 // FAVORITOS — VOIEHAUTE
 // =====================================================

 // CONSULTAR SE UMA JOIA É FAVORITA
 app.get('/favoritos/verificar/:id', (req, res) => {
     if (!req.session.clienteId) {
         return res.json({ favorito: false });
     }

     db.get(
         `SELECT id FROM favoritos
          WHERE cliente_id = ? AND produto_id = ?`,
         [req.session.clienteId, req.params.id],
         (erro, favorito) => {
             if (erro) {
                 console.error(erro);
                 return res.status(500).json({
                     erro: 'Erro ao consultar favoritos.'
                 });
             }

             res.json({ favorito: !!favorito });
         }
     );
 });

 // ADICIONAR OU REMOVER FAVORITO
 app.post('/favoritos/alternar/:id', exigirLogin, (req, res) => {
     const clienteId = req.session.clienteId;
     const produtoId = Number(req.params.id);

     if (!Number.isInteger(produtoId) || produtoId <= 0) {
         return res.status(400).json({
             erro: 'Produto inválido.'
         });
     }

     db.get(
         `SELECT id FROM favoritos
          WHERE cliente_id = ? AND produto_id = ?`,
         [clienteId, produtoId],
         (erro, favorito) => {
             if (erro) {
                 console.error(erro);
                 return res.status(500).json({
                     erro: 'Erro ao consultar favorito.'
                 });
             }

             if (favorito) {
                 db.run(
                     `DELETE FROM favoritos
                      WHERE cliente_id = ? AND produto_id = ?`,
                     [clienteId, produtoId],
                     erroRemocao => {
                         if (erroRemocao) {
                             console.error(erroRemocao);
                             return res.status(500).json({
                                 erro: 'Erro ao remover favorito.'
                             });
                         }

                         res.json({ favorito: false });
                     }
                 );
             } else {
                 db.run(
                     `INSERT INTO favoritos (cliente_id, produto_id)
                      VALUES (?, ?)`,
                     [clienteId, produtoId],
                     erroInsercao => {
                         if (erroInsercao) {
                             console.error(erroInsercao);
                             return res.status(500).json({
                                 erro: 'Erro ao adicionar favorito.'
                             });
                         }

                         res.json({ favorito: true });
                     }
                 );
             }
         }
     );
 });


// =====================================================
// HOME DO CLIENTE
// =====================================================

app.get('/', (req, res) => {
    db.all(`
        SELECT *
        FROM produtos
        WHERE estoque > 0
        ORDER BY id DESC
    `, [], (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/index', {
            produtos: produtos
        });
    });
});

// =====================================================
// PÁGINA INDIVIDUAL DO PRODUTO
// =====================================================

app.get('/produto/:id', (req, res) => {
    const id = req.params.id;

    db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id],
        (erro, produto) => {
            if (erro) {
                console.error(erro.message);

                return res.status(500).send(
                    'Erro ao buscar produto.'
                );
            }

            if (!produto) {
                return res.status(404).send(
                    'Produto não encontrado.'
                );
            }

            db.all(`
                SELECT *
                FROM produtos
                WHERE colecao = ?
                AND id != ?
                AND estoque > 0
                ORDER BY id ASC
            `, [produto.colecao, produto.id], (erro, outrosProdutos) => {
                if (erro) {
                    console.error(erro.message);
                    outrosProdutos = [];
                }

                res.render('cliente/produto', {
                    produto: produto,
                    outrosProdutos: outrosProdutos
                });
            });
        }
    );
});

// =====================================================
// BUSCA DE PRODUTOS
// =====================================================

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
            termo, termo, termo,
            termo, termo, termo
        );
    }

    sql += ' ORDER BY id DESC';

    db.all(sql, parametros, (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/busca', {
            produtos,
            pesquisa
        });
    });
});

// =====================================================
// FUNÇÃO AUXILIAR — CATEGORIAS DE JOIAS
// =====================================================

function buscarProdutosCategoria(categoria, callback) {
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

        WHERE p.categoria = ?
        AND p.estoque > 0

        ORDER BY p.id ASC
    `;

    db.all(sql, [categoria], callback);
}

// =====================================================
// CATEGORIA — ANÉIS
// =====================================================

app.get('/joias/aneis', (req, res) => {
    buscarProdutosCategoria('Anéis', (erro, aneis) => {
        if (erro) {
            console.error(erro.message);

            return res.status(500).send(
                'Erro ao carregar os anéis.'
            );
        }

        res.render('cliente/aneis', { aneis });
    });
});

// =====================================================
// CATEGORIA — COLARES
// =====================================================

app.get('/joias/colares', (req, res) => {
    buscarProdutosCategoria('Colares', (erro, colares) => {
        if (erro) {
            console.error(erro.message);

            return res.status(500).send(
                'Erro ao carregar os colares.'
            );
        }

        res.render('cliente/colares', { colares });
    });
});

// =====================================================
// CATEGORIA — PULSEIRAS
// =====================================================

app.get('/joias/pulseiras', (req, res) => {
    buscarProdutosCategoria('Pulseiras', (erro, pulseiras) => {
        if (erro) {
            console.error(erro.message);

            return res.status(500).send(
                'Erro ao carregar as pulseiras.'
            );
        }

        res.render('cliente/pulseiras', { pulseiras });
    });
});

// =====================================================
// CATEGORIA — BRINCOS
// =====================================================

app.get('/joias/brincos', (req, res) => {
    buscarProdutosCategoria('Brincos', (erro, brincos) => {
        if (erro) {
            console.error(erro.message);

            return res.status(500).send(
                'Erro ao carregar os brincos.'
            );
        }

        res.render('cliente/brincos', { brincos });
    });
});

// =====================================================
// CATEGORIA — TIARAS
// =====================================================

app.get('/joias/tiaras', (req, res) => {
    buscarProdutosCategoria('Tiaras', (erro, tiaras) => {
        if (erro) {
            console.error(erro.message);

            return res.status(500).send(
                'Erro ao carregar as tiaras.'
            );
        }

        res.render('cliente/tiaras', { tiaras });
    });
});

// =====================================================
// FUNÇÃO AUXILIAR — COLEÇÕES
// =====================================================

function buscarProdutosColecao(colecao, callback) {
    db.all(`
        SELECT *
        FROM produtos
        WHERE colecao = ?
        AND estoque > 0
        ORDER BY id ASC
    `, [colecao], callback);
}

// =====================================================
// COLEÇÃO — L'HÉRITAGE
// =====================================================

app.get('/colecao/lheritage', (req, res) => {
    buscarProdutosColecao('L’Héritage', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/lheritage', { produtos });
    });
});

// =====================================================
// COLEÇÃO — LA COURONNE
// =====================================================

app.get('/colecao/lacouronne', (req, res) => {
    buscarProdutosColecao('La Couronne', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/lacouronne', { produtos });
    });
});

// =====================================================
// COLEÇÃO — MINUIT
// =====================================================

app.get('/colecao/minuit', (req, res) => {
    buscarProdutosColecao('Minuit', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/minuit', { produtos });
    });
});

// =====================================================
// COLEÇÃO — JARDIN DES ROIS
// =====================================================

app.get('/colecao/jardindesrois', (req, res) => {
    buscarProdutosColecao('Jardin des Rois', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/jardindesrois', { produtos });
    });
});

// =====================================================
// COLEÇÃO — PREMIÈRE LUMIÈRE
// =====================================================

app.get('/colecao/premierelumiere', (req, res) => {
    buscarProdutosColecao('Première Lumière', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/premierelumiere', { produtos });
    });
});

// =====================================================
// COLEÇÃO — LUMIÈRE DU BRÉSIL
// =====================================================

app.get('/colecao/lumieredubresil', (req, res) => {
    buscarProdutosColecao('Lumière du Brésil', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/lumieredubresil', { produtos });
    });
});

// =====================================================
// COLEÇÃO — VELOURS DE MINUIT
// =====================================================

app.get('/colecao/veloursdeminuit', (req, res) => {
    buscarProdutosColecao('Velours de Minuit', (erro, produtos) => {
        if (erro) {
            console.error(erro.message);
            produtos = [];
        }

        res.render('cliente/veloursdeminuit', { produtos });
    });
});

// =====================================================
// LA MAISON
// =====================================================

app.get('/maison', (req, res) => {
    res.render('cliente/maison');
});

// =====================================================
// ROTAS ADMINISTRATIVAS
// =====================================================

const appAdmin = require('./rotas/admin');

console.log('TIPO DO ADMIN:', typeof appAdmin);

app.use('/admin', appAdmin);

// =====================================================
// ROTAS DA SACOLA
// =====================================================

const appCarrinho = require('./rotas/carrinho');

app.use('/carrinho', appCarrinho);

// =====================================================
// AUTENTICAÇÃO DOS CLIENTES
// =====================================================

const clienteAuth = require('./rotas/clienteAuth');

app.use('/cliente', clienteAuth);


/* =====================================================
   MEUS FAVORITOS — VOIEHAUTE
   ===================================================== */

app.get('/favoritos', exigirLogin, async (req, res) => {
    try {
        if (db.bancoPronto) {
            await db.bancoPronto;
        }

        const clienteId = req.session.clienteId;

        const sql = `
            SELECT
                p.id,
                p.nome,
                p.imagem,
                p.valor,
                p.colecao,
                p.imagem_secundaria

            FROM favoritos f

            INNER JOIN produtos p
                ON p.id = f.produto_id

            WHERE f.cliente_id = ?

            ORDER BY f.criado_em DESC, f.id DESC
        `;

        db.all(sql, [clienteId], (erro, favoritos) => {
            if (erro) {
                console.error(
                    'Erro ao buscar favoritos:',
                    erro
                );

                return res.status(500).send(
                    'Não foi possível carregar seus favoritos.'
                );
            }

            res.render('cliente/favoritos', {
                favoritos: favoritos || []
            });
        });

    } catch (erro) {
        console.error(
            'Erro na página de favoritos:',
            erro
        );

        res.status(500).send(
            'Não foi possível carregar seus favoritos.'
        );
    }
});



// =====================================================
// PERFIL — DADOS PESSOAIS DO CLIENTE
// =====================================================

app.get('/perfil', exigirLogin, (req, res) => {
    const clienteId = req.session.clienteId;

    db.get(
        `SELECT id, nome, email, telefone, nascimento, cpf, foto
         FROM clientes
         WHERE id = ?`,

        [clienteId],

        (erro, cliente) => {
            if (erro) {
                console.error(
                    'Erro ao buscar cliente:',
                    erro.message
                );

                return res.status(500).send(
                    'Erro ao carregar os dados pessoais.'
                );
            }

            if (!cliente) {
                return res.status(404).send(
                    'Cliente não encontrado.'
                );
            }

            res.render('cliente/perfil', {
                cliente: cliente
            });
        }
    );
});

// =====================================================
// EDITAR DADOS PESSOAIS — TELA
// =====================================================

app.get('/perfil/editar', exigirLogin, (req, res) => {
    db.get(
        `SELECT id, nome, email, telefone, nascimento, cpf, foto
         FROM clientes
         WHERE id = ?`,

        [req.session.clienteId],

        (erro, cliente) => {
            if (erro) {
                console.error(erro.message);

                return res.status(500).send(
                    'Erro ao carregar os dados.'
                );
            }

            if (!cliente) {
                return res.status(404).send(
                    'Cliente não encontrado.'
                );
            }

            res.render('cliente/perfil-editar', {
                cliente,
                erro: null
            });
        }
    );
});

// =====================================================
// SALVAR ALTERAÇÕES DOS DADOS PESSOAIS E FOTO
// =====================================================

app.post(
    '/perfil/editar',
    exigirLogin,
    uploadFotoPerfil.single('foto'),
    (req, res) => {

        const clienteId = req.session.clienteId;

        const novaFoto = req.file
            ? `/uploads/perfis/${req.file.filename}`
            : null;

        const nome = (req.body.nome || '').trim();

        const email = (req.body.email || '')
            .trim()
            .toLowerCase();

        const telefone = (req.body.telefone || '').trim();

        const nascimento = (req.body.nascimento || '').trim();

        const cpf = (req.body.cpf || '').replace(/\D/g, '');

        const cliente = {
            nome,
            email,
            telefone,
            nascimento,
            cpf,
            foto: novaFoto
        };

        // CAMPOS OBRIGATÓRIOS

        if (!nome || !email || !telefone || !nascimento || !cpf) {
            return res.render('cliente/perfil-editar', {
                cliente,
                erro: 'Preencha todos os campos obrigatórios.'
            });
        }

        // VALIDAÇÃO DE EMAIL

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.render('cliente/perfil-editar', {
                cliente,
                erro: 'Informe um e-mail válido.'
            });
        }

        // VALIDAÇÃO DE CPF

        if (cpf.length !== 11) {
            return res.render('cliente/perfil-editar', {
                cliente,
                erro: 'O CPF deve conter 11 números.'
            });
        }

        // ATUALIZAR CLIENTE NO BANCO

        db.run(
            `UPDATE clientes
             SET nome = ?,
                 email = ?,
                 telefone = ?,
                 nascimento = ?,
                 cpf = ?,
                 foto = COALESCE(?, foto)
             WHERE id = ?`,

            [
                nome,
                email,
                telefone,
                nascimento,
                cpf,
                novaFoto,
                clienteId
            ],

            function (erro) {
                if (erro) {
                    console.error(erro.message);

                    const mensagem = erro.code === 'SQLITE_CONSTRAINT'
                        ? 'Este CPF ou e-mail já está cadastrado.'
                        : 'Não foi possível salvar suas alterações.';

                    return res.render('cliente/perfil-editar', {
                        cliente,
                        erro: mensagem
                    });
                }

                res.redirect('/perfil');
            }
        );
    }
);


// =====================================================
// MINHA CONTA — ENDEREÇOS
// =====================================================


app.get('/perfil/enderecos', exigirLogin, (req, res) => {

    db.all(
        `SELECT *
         FROM enderecos_clientes
         WHERE cliente_id = ?
         ORDER BY principal DESC, id DESC`,

        [req.session.clienteId],

        (erro, enderecos) => {
            if (erro) {
                console.error(erro.message);

                return res.status(500).send(
                    'Erro ao carregar os endereços.'
                );
            }

            res.render('cliente/enderecos', {
                enderecos
            });
        }
    );
});


/* =====================================================
   BANCO DE DADOS — ENDEREÇOS DOS CLIENTES
   ===================================================== */

db.run(`
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
`, (erro) => {
    if (erro) {
        console.error('Erro ao criar tabela de endereços:', erro.message);
    }
});


// =====================================================
// ADICIONAR ENDEREÇO — TELA
// =====================================================

app.get('/perfil/enderecos/adicionar', exigirLogin, (req, res) => {
    res.render('cliente/endereco-adicionar', {
        erro: null
    });
});

// =====================================================
// ADICIONAR ENDEREÇO — SALVAR NO BANCO
// =====================================================

app.post('/perfil/enderecos/adicionar', exigirLogin, (req, res) => {

    const clienteId = req.session.clienteId;

    const nome = (req.body.nome || '').trim();
    const cpf = (req.body.cpf || '').replace(/\D/g, '');
    const cep = (req.body.cep || '').replace(/\D/g, '');
    const endereco = (req.body.endereco || '').trim();
    const numero = (req.body.numero || '').trim();
    const complemento = (req.body.complemento || '').trim();
    const bairro = (req.body.bairro || '').trim();
    const cidade = (req.body.cidade || '').trim();
    const estado = (req.body.estado || '').trim().toUpperCase();
    const principal = req.body.principal === '1' ? 1 : 0;

    function mostrarErro(mensagem) {
        res.status(400).render('cliente/endereco-adicionar', {
            erro: mensagem
        });
    }

    if (!nome || !cpf || !cep || !endereco ||
        !numero || !bairro || !cidade || !estado) {

        return mostrarErro('Preencha todos os campos obrigatórios.');
    }

    if (cpf.length !== 11) {
        return mostrarErro('O CPF deve conter 11 números.');
    }

    if (cep.length !== 8) {
        return mostrarErro('O CEP deve conter 8 números.');
    }

    if (!/^[A-Z]{2}$/.test(estado)) {
        return mostrarErro('Informe a sigla do estado com 2 letras.');
    }

    db.serialize(() => {

        db.run('BEGIN IMMEDIATE TRANSACTION');

        db.get(
            'SELECT COUNT(*) AS total FROM enderecos_clientes WHERE cliente_id = ?',
            [clienteId],
            (erro, resultado) => {

                if (erro) {
                    return db.run('ROLLBACK', () => {
                        console.error(erro.message);
                        res.status(500).send('Erro ao verificar endereços.');
                    });
                }

                // O primeiro endereço será principal automaticamente.
                const tornarPrincipal = resultado.total === 0 || principal === 1 ? 1 : 0;

                const inserir = () => {
                    db.run(
                        `INSERT INTO enderecos_clientes
                         (cliente_id, nome, cpf, cep, endereco, numero,
                          complemento, bairro, cidade, estado, principal)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

                        [
                            clienteId, nome, cpf, cep, endereco, numero,
                            complemento, bairro, cidade, estado, tornarPrincipal
                        ],

                        function (erro) {
                            if (erro) {
                                return db.run('ROLLBACK', () => {
                                    console.error(erro.message);
                                    res.status(500).send('Erro ao salvar endereço.');
                                });
                            }

                            db.run('COMMIT', (erro) => {
                                if (erro) {
                                    console.error(erro.message);
                                    return res.status(500).send('Erro ao finalizar cadastro.');
                                }

                                res.redirect('/perfil/enderecos');
                            });
                        }
                    );
                };

                if (tornarPrincipal) {
                    db.run(
                        `UPDATE enderecos_clientes
                         SET principal = 0
                         WHERE cliente_id = ?`,
                        [clienteId],
                        (erro) => {
                            if (erro) {
                                return db.run('ROLLBACK', () => {
                                    console.error(erro.message);
                                    res.status(500).send('Erro ao atualizar endereço principal.');
                                });
                            }

                            inserir();
                        }
                    );
                } else {
                    inserir();
                }
            }
        );
    });
});


/* =====================================================
   EDITAR ENDEREÇO — VOIEHAUTE
   ===================================================== */

// ABRIR FORMULÁRIO DE EDIÇÃO
app.get('/perfil/enderecos/:id/editar', exigirLogin, (req, res) => {

    db.get(
        `SELECT *
         FROM enderecos_clientes
         WHERE id = ? AND cliente_id = ?`,
        [req.params.id, req.session.clienteId],
        (erro, endereco) => {

            if (erro) {
                console.error(erro.message);
                return res.status(500).send('Erro ao carregar endereço.');
            }

            if (!endereco) {
                return res.status(404).send('Endereço não encontrado.');
            }

            res.render('cliente/endereco-editar', {
                endereco,
                erro: null
            });
        }
    );
});

// SALVAR ALTERAÇÕES
app.post('/perfil/enderecos/:id/editar', exigirLogin, (req, res) => {

    const {
        nome, cpf, cep, endereco, numero,
        complemento, bairro, cidade, estado, principal
    } = req.body;

    const clienteId = req.session.clienteId;
    const enderecoId = req.params.id;

    const dados = {
        nome: (nome || '').trim(),
        cpf: (cpf || '').replace(/\D/g, ''),
        cep: (cep || '').replace(/\D/g, ''),
        endereco: (endereco || '').trim(),
        numero: (numero || '').trim(),
        complemento: (complemento || '').trim(),
        bairro: (bairro || '').trim(),
        cidade: (cidade || '').trim(),
        estado: (estado || '').trim().toUpperCase(),
        principal: principal ? 1 : 0
    };

    if (
        !dados.nome || dados.cpf.length !== 11 ||
        dados.cep.length !== 8 || !dados.endereco ||
        !dados.numero || !dados.bairro ||
        !dados.cidade || !/^[A-Z]{2}$/.test(dados.estado)
    ) {
        return res.status(400).send('Confira os dados do endereço.');
    }

    db.serialize(() => {

        db.run('BEGIN IMMEDIATE TRANSACTION');

        db.get(
            `SELECT id, principal
             FROM enderecos_clientes
             WHERE id = ? AND cliente_id = ?`,
            [enderecoId, clienteId],
            (erro, atual) => {

                if (erro || !atual) {
                    return db.run('ROLLBACK', () => {
                        res.status(erro ? 500 : 404).send(
                            erro ? 'Erro ao editar endereço.' : 'Endereço não encontrado.'
                        );
                    });
                }

                // O endereço principal não pode ficar sem substituto.
                const seraPrincipal = dados.principal || atual.principal ? 1 : 0;

                const atualizar = () => {
                    db.run(
                        `UPDATE enderecos_clientes
                         SET nome = ?, cpf = ?, cep = ?,
                             endereco = ?, numero = ?, complemento = ?,
                             bairro = ?, cidade = ?, estado = ?,
                             principal = ?
                         WHERE id = ? AND cliente_id = ?`,
                        [
                            dados.nome, dados.cpf, dados.cep,
                            dados.endereco, dados.numero, dados.complemento,
                            dados.bairro, dados.cidade, dados.estado,
                            seraPrincipal, enderecoId, clienteId
                        ],
                        (erro) => {

                            if (erro) {
                                return db.run('ROLLBACK', () => {
                                    console.error(erro.message);
                                    res.status(500).send('Erro ao salvar endereço.');
                                });
                            }

                            db.run('COMMIT', (erro) => {
                                if (erro) {
                                    console.error(erro.message);
                                    return res.status(500).send('Erro ao finalizar edição.');
                                }

                                res.redirect('/perfil/enderecos');
                            });
                        }
                    );
                };

                if (dados.principal) {
                    db.run(
                        `UPDATE enderecos_clientes
                         SET principal = 0
                         WHERE cliente_id = ?`,
                        [clienteId],
                        (erro) => {
                            if (erro) {
                                return db.run('ROLLBACK', () => {
                                    res.status(500).send('Erro ao atualizar endereço principal.');
                                });
                            }

                            atualizar();
                        }
                    );
                } else {
                    atualizar();
                }
            }
        );
    });
});


/* =====================================================
   EXCLUIR ENDEREÇO — VOIEHAUTE
   ===================================================== */

app.post('/perfil/enderecos/:id/excluir', exigirLogin, (req, res) => {

    const clienteId = req.session.clienteId;
    const enderecoId = req.params.id;

    db.serialize(() => {

        db.run('BEGIN IMMEDIATE TRANSACTION', (erro) => {

            if (erro) {
                console.error(erro.message);
                return res.status(500).send('Erro ao iniciar exclusão.');
            }

            const cancelar = (mensagem) => {
                db.run('ROLLBACK', () => {
                    res.status(500).send(mensagem);
                });
            };

            db.get(
                `SELECT id, principal
                 FROM enderecos_clientes
                 WHERE id = ? AND cliente_id = ?`,
                [enderecoId, clienteId],
                (erro, endereco) => {

                    if (erro) {
                        console.error(erro.message);
                        return cancelar('Erro ao consultar endereço.');
                    }

                    if (!endereco) {
                        return db.run('ROLLBACK', () => {
                            res.status(404).send('Endereço não encontrado.');
                        });
                    }

                    db.run(
                        `DELETE FROM enderecos_clientes
                         WHERE id = ? AND cliente_id = ?`,
                        [enderecoId, clienteId],
                        (erro) => {

                            if (erro) {
                                console.error(erro.message);
                                return cancelar('Erro ao excluir endereço.');
                            }

                            const finalizar = () => {
                                db.run('COMMIT', (erro) => {

                                    if (erro) {
                                        console.error(erro.message);
                                        return res.status(500).send(
                                            'Erro ao finalizar exclusão.'
                                        );
                                    }

                                    res.redirect('/perfil/enderecos');
                                });
                            };

                            // Se excluiu o principal, escolher outro.
                            if (endereco.principal) {

                                db.run(
                                    `UPDATE enderecos_clientes
                                     SET principal = 1
                                     WHERE id = (
                                         SELECT id
                                         FROM enderecos_clientes
                                         WHERE cliente_id = ?
                                         ORDER BY id DESC
                                         LIMIT 1
                                     )
                                     AND cliente_id = ?`,
                                    [clienteId, clienteId],
                                    (erro) => {

                                        if (erro) {
                                            console.error(erro.message);
                                            return cancelar(
                                                'Erro ao atualizar endereço principal.'
                                            );
                                        }

                                        finalizar();
                                    }
                                );

                            } else {
                                finalizar();
                            }

                        }
                    );
                }
            );
        });
    });
});


/* =====================================================
   MEUS PEDIDOS — VOIEHAUTE
   ===================================================== */

app.get('/perfil/pedidos', exigirLogin, async (req, res) => {
    try {
        if (db.bancoPronto) {
            await db.bancoPronto;
        }

        // FILTROS
        const filtrosPermitidos = [
            'todos',
            'andamento',
            'entregues',
            'cancelados'
        ];

        const filtro = filtrosPermitidos.includes(req.query.filtro)
            ? req.query.filtro
            : 'todos';

        const clienteId = req.session.clienteId;

        let condicaoStatus = '';
        const parametros = [clienteId];

        if (filtro === 'andamento') {
            condicaoStatus = `
                AND p.status IN (
                    'confirmado',
                    'preparando',
                    'enviado'
                )
            `;
        } else if (filtro === 'entregues') {
            condicaoStatus = `AND p.status = 'entregue'`;
        } else if (filtro === 'cancelados') {
            condicaoStatus = `AND p.status = 'cancelado'`;
        }

        // BUSCAR PEDIDOS E INFORMAÇÕES DOS PRODUTOS
        const sql = `
            SELECT
                p.*,

                -- ID DA PRIMEIRA JOIA DO PEDIDO
                (
                    SELECT pi.produto_id
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = p.id
                    ORDER BY pi.id ASC
                    LIMIT 1
                ) AS produto_id,

                -- NOME DA JOIA
                (
                    SELECT pi.nome_produto
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = p.id
                    ORDER BY pi.id ASC
                    LIMIT 1
                ) AS nome_produto,

                -- COLEÇÃO DA JOIA
                (
                    SELECT pi.colecao_produto
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = p.id
                    ORDER BY pi.id ASC
                    LIMIT 1
                ) AS colecao_produto,

                -- IMAGEM DA JOIA
                (
                    SELECT pi.imagem_produto
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = p.id
                    ORDER BY pi.id ASC
                    LIMIT 1
                ) AS imagem_produto,

                -- QUANTIDADE TOTAL DE JOIAS
                (
                    SELECT COALESCE(SUM(pi.quantidade), 0)
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = p.id
                ) AS quantidade_itens

            FROM pedidos p

            WHERE p.cliente_id = ?
            ${condicaoStatus}

            ORDER BY p.criado_em DESC, p.id DESC
        `;

        db.all(sql, parametros, (erro, pedidos) => {
            if (erro) {
                console.error(
                    'Erro ao buscar pedidos:',
                    erro
                );

                return res.status(500).send(
                    'Não foi possível carregar seus pedidos.'
                );
            }

            res.render('cliente/pedidos', {
                pedidos: pedidos || [],
                filtro
            });
        });

    } catch (erro) {
        console.error(
            'Erro na página de pedidos:',
            erro
        );

        res.status(500).send(
            'Não foi possível carregar seus pedidos.'
        );
    }
});



/* =====================================================
   VOIEHAUTE — DETALHES DE UM PEDIDO
   ===================================================== */

app.get('/perfil/pedidos/:id', exigirLogin, async (req, res) => {
    try {
        if (db.bancoPronto) {
            await db.bancoPronto;
        }

        const pedidoId = Number(req.params.id);
        const clienteId = req.session.clienteId;

        if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
            return res.status(404).send('Pedido não encontrado.');
        }

        db.get(
            `SELECT *
             FROM pedidos
             WHERE id = ? AND cliente_id = ?`,
            [pedidoId, clienteId],
            (erro, pedido) => {
                if (erro) {
                    console.error(erro);
                    return res.status(500).send(
                        'Erro ao carregar o pedido.'
                    );
                }

                if (!pedido) {
                    return res.status(404).send(
                        'Pedido não encontrado.'
                    );
                }

                db.all(
                    `SELECT *
                     FROM pedido_itens
                     WHERE pedido_id = ?
                     ORDER BY id ASC`,
                    [pedidoId],
                    (erroItens, itens) => {
                        if (erroItens) {
                            console.error(erroItens);
                            return res.status(500).send(
                                'Erro ao carregar os produtos.'
                            );
                        }

                        db.all(
                            `SELECT *
                             FROM pedido_historico
                             WHERE pedido_id = ?
                             ORDER BY data_status ASC, id ASC`,
                            [pedidoId],
                            (erroHistorico, historico) => {
                                if (erroHistorico) {
                                    console.error(erroHistorico);
                                    return res.status(500).send(
                                        'Erro ao carregar o acompanhamento.'
                                    );
                                }

                                res.render('cliente/pedido-detalhes', {
                                    pedido,
                                    itens,
                                    historico
                                });
                            }
                        );
                    }
                );
            }
        );
    } catch (erro) {
        console.error(erro);
        res.status(500).send(
            'Não foi possível carregar os detalhes.'
        );
    }
});



 // =====================================================
 // MEUS FAVORITOS — LISTAR JOIAS
 // =====================================================

 app.get('/favoritos', exigirLogin, async (req, res) => {
     try {
         if (db.bancoPronto) {
             await db.bancoPronto;
         }

         const clienteId = req.session.clienteId;

         db.all(
             `SELECT
                 p.id,
                 p.nome,
                 p.imagem,
                 p.valor,
                 p.colecao
              FROM favoritos f
              INNER JOIN produtos p
                  ON p.id = f.produto_id
              WHERE f.cliente_id = ?
              ORDER BY f.criado_em DESC, f.id DESC`,
             [clienteId],
             (erro, favoritos) => {
                 if (erro) {
                     console.error('Erro ao listar favoritos:', erro);

                     return res.status(500).send(
                         'Não foi possível carregar seus favoritos.'
                     );
                 }

                 res.render('cliente/favoritos', {
                     favoritos: favoritos || []
                 });
             }
         );

     } catch (erro) {
         console.error('Erro na página de favoritos:', erro);

         res.status(500).send(
             'Não foi possível carregar seus favoritos.'
         );
     }
 });


// =====================================================
// SERVIDOR
// =====================================================

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
