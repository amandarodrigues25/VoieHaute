
const express = require('express');
const appCarrinho = express.Router();
const db = require('../banco/database');
const crypto = require('crypto');

// =====================================================
// OBTER SACOLA DA SESSÃO
// =====================================================

function obterCarrinho(req) {
    if (!Array.isArray(req.session.carrinho)) {
        req.session.carrinho = [];
    }

    return req.session.carrinho;
}

// =====================================================
// BUSCAR PRODUTOS NO BANCO
// =====================================================

function buscarProdutos(ids, callback) {
    if (!ids.length) {
        return callback(null, []);
    }

    const marcadores = ids.map(() => '?').join(', ');

    db.all(
        `SELECT * FROM produtos WHERE id IN (${marcadores})`,
        ids,
        callback
    );
}

// =====================================================
// MONTAR ITENS E TOTAL DA SACOLA
// =====================================================

function montarItens(carrinho, produtosBanco) {
    return carrinho.flatMap(item => {
        const produto = produtosBanco.find(
            p => Number(p.id) === Number(item.id)
        );

        if (!produto) return [];

        return [{
            produto,
            quantidade: item.quantidade,
            subtotal: Number(produto.valor) * item.quantidade
        }];
    });
}

function calcularTotal(itens) {
    return itens.reduce(
        (soma, item) => soma + item.subtotal,
        0
    );
}

// =====================================================
// VISUALIZAR SACOLA PRINCIPAL
// =====================================================

appCarrinho.get('/', (req, res) => {
    const carrinho = obterCarrinho(req);

    buscarProdutos(
        carrinho.map(item => item.id),
        (erro, produtosBanco) => {
            if (erro) {
                console.error(erro);

                return res.status(500).send(
                    'Erro ao consultar a sacola.'
                );
            }

            const itens = montarItens(carrinho, produtosBanco);
            const total = calcularTotal(itens);

            const totalItens = itens.reduce(
                (soma, item) => soma + item.quantidade,
                0
            );

            res.render('cliente/carrinho', {
                itens,
                total,
                totalItens
            });
        }
    );
});

// =====================================================
// ADICIONAR PRODUTO À SACOLA
// =====================================================

appCarrinho.post('/adicionar/:id', (req, res) => {
    const id = Number(req.params.id);

    const respostaJSON = (
        req.get('Accept') || ''
    ).includes('application/json');

    function responderErro(status, mensagem) {
        if (respostaJSON) {
            return res.status(status).json({
                sucesso: false,
                mensagem
            });
        }

        return res.status(status).send(mensagem);
    }

    if (!Number.isInteger(id) || id <= 0) {
        return responderErro(400, 'Produto inválido.');
    }

    db.get(
        'SELECT * FROM produtos WHERE id = ?',
        [id],
        (erro, produto) => {
            if (erro) {
                console.error(erro);

                return responderErro(
                    500,
                    'Erro ao consultar o produto.'
                );
            }

            if (!produto || Number(produto.estoque) <= 0) {
                return responderErro(
                    400,
                    'Esta joia está indisponível.'
                );
            }

            const carrinho = obterCarrinho(req);

            const item = carrinho.find(
                i => Number(i.id) === id
            );

            if (
                item &&
                item.quantidade >= Number(produto.estoque)
            ) {
                return responderErro(
                    400,
                    'Estoque insuficiente.'
                );
            }

            if (item) {
                item.quantidade++;
            } else {
                carrinho.push({
                    id,
                    quantidade: 1
                });
            }

            // FORMULÁRIO NORMAL

            if (!respostaJSON) {
                return req.session.save(erroSessao => {
                    if (erroSessao) {
                        console.error(erroSessao);

                        return responderErro(
                            500,
                            'Erro ao salvar a sacola.'
                        );
                    }

                    res.redirect('/carrinho');
                });
            }

            // CARRINHO MINIMIZADO:
            // SUGESTÕES DA MESMA CATEGORIA

            db.all(
                `SELECT
                    p.id,
                    p.nome,
                    p.imagem,
                    p.valor
                 FROM produtos p
                 WHERE p.categoria = ?
                   AND p.id != ?
                   AND p.estoque > 0
                 ORDER BY RANDOM()
                 LIMIT 2`,
                [produto.categoria, id],
                (erroSugestoes, sugestoes) => {
                    if (erroSugestoes) {
                        console.error(
                            'Erro ao buscar sugestões:',
                            erroSugestoes.message
                        );

                        sugestoes = [];
                    }

                    req.session.save(erroSessao => {
                        if (erroSessao) {
                            console.error(erroSessao);

                            return responderErro(
                                500,
                                'Erro ao salvar a sacola.'
                            );
                        }

                        res.json({
                            sucesso: true,

                            produto: {
                                id: produto.id,
                                nome: produto.nome,
                                categoria: produto.categoria,
                                colecao: produto.colecao,
                                imagem: produto.imagem,
                                valor: produto.valor
                            },

                            sugestoes: sugestoes || []
                        });
                    });
                }
            );
        }
    );
});

// =====================================================
// DIMINUIR QUANTIDADE
// =====================================================

appCarrinho.post('/diminuir/:id', (req, res) => {
    const id = Number(req.params.id);
    const carrinho = obterCarrinho(req);

    const item = carrinho.find(
        i => Number(i.id) === id
    );

    if (item) {
        item.quantidade--;

        if (item.quantidade <= 0) {
            req.session.carrinho = carrinho.filter(
                i => Number(i.id) !== id
            );
        }
    }

    req.session.save(erro => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao atualizar a sacola.'
            );
        }

        res.redirect('/carrinho');
    });
});

// =====================================================
// REMOVER PRODUTO
// =====================================================

appCarrinho.post('/remover/:id', (req, res) => {
    const id = Number(req.params.id);

    req.session.carrinho = obterCarrinho(req).filter(
        item => Number(item.id) !== id
    );

    req.session.save(erro => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao remover o produto.'
            );
        }

        res.redirect('/carrinho');
    });
});

// =====================================================
// ESVAZIAR SACOLA
// =====================================================

appCarrinho.post('/limpar', (req, res) => {
    req.session.carrinho = [];
    delete req.session.pagamento;

    req.session.save(erro => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao esvaziar a sacola.'
            );
        }

        res.redirect('/carrinho');
    });
});

// =====================================================
// ENTREGA — ETAPA 2 DO CHECKOUT
// =====================================================

const camposEntrega = [
    'nome',
    'cpf',
    'cep',
    'endereco',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'estado'
];

// =====================================================
// VERIFICAR SE ENDEREÇO ESTÁ PREENCHIDO
// =====================================================

function enderecoPreenchido(dados) {
    return !!dados && [
        'nome',
        'cpf',
        'cep',
        'endereco',
        'numero',
        'bairro',
        'cidade',
        'estado'
    ].every(
        campo => String(dados[campo] || '').trim()
    );
}

// =====================================================
// MONTAR ENDEREÇO A PARTIR DO FORMULÁRIO
// =====================================================

function montarEndereco(body) {
    const endereco = {};

    camposEntrega.forEach(campo => {
        endereco[campo] = String(
            body[campo] || ''
        ).trim();
    });

    endereco.salvar = body.salvar === 'on';

    return endereco;
}

// =====================================================
// EXIGIR LOGIN ANTES DA ENTREGA
// =====================================================

function exigirLoginEntrega(req, res, next) {
    if (req.session.clienteId) {
        return next();
    }

    req.session.retornoAposLogin = '/carrinho/entrega';

    req.session.save(erro => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao iniciar a compra.'
            );
        }

        res.redirect('/cliente/login');
    });
}

// =====================================================
// BUSCAR ENDEREÇO DO CLIENTE NO BANCO
// =====================================================

function buscarEnderecoCliente(clienteId, callback) {
    db.get(
        `SELECT *
         FROM enderecos_clientes
         WHERE cliente_id = ?`,
        [clienteId],
        callback
    );
}

// =====================================================
// CARREGAR RESUMO DO PEDIDO E ENDEREÇO
// =====================================================

function carregarResumoEntrega(req, res, dadosPagina = {}) {
    const carrinho = obterCarrinho(req);

    const ids = carrinho.map(
        item => item.id
    );

    if (!ids.length) {
        return res.redirect('/carrinho');
    }

    buscarProdutos(ids, (erro, produtosBanco) => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao carregar o resumo do pedido.'
            );
        }

        const itens = montarItens(carrinho, produtosBanco);

        if (!itens.length) {
            return res.redirect('/carrinho');
        }

        const total = calcularTotal(itens);

        buscarEnderecoCliente(
            req.session.clienteId,
            (erroEndereco, enderecoBanco) => {
                if (erroEndereco) {
                    console.error(erroEndereco);

                    return res.status(500).send(
                        'Erro ao consultar o endereço.'
                    );
                }

                const endereco =
                    dadosPagina.endereco !== undefined
                        ? dadosPagina.endereco
                        : enderecoBanco;

                const modo =
                    dadosPagina.modo ||
                    (enderecoBanco ? 'resumo' : 'novo');

                res.render('cliente/entrega', {
                    itens,
                    total,
                    endereco,
                    modo,
                    erroEntrega:
                        dadosPagina.erroEntrega || null
                });
            }
        );
    });
}

// =====================================================
// VISUALIZAR ENTREGA
// =====================================================

appCarrinho.get(
    '/entrega',
    exigirLoginEntrega,
    (req, res) => {
        carregarResumoEntrega(req, res, {
            modo: req.query.editar === '1'
                ? 'editar'
                : undefined
        });
    }
);

// =====================================================
// SALVAR OU EDITAR ENDEREÇO
// =====================================================

appCarrinho.post(
    '/entrega/salvar',
    exigirLoginEntrega,
    (req, res) => {
        const endereco = montarEndereco(
            req.body || {}
        );

        const clienteId = req.session.clienteId;

        if (!enderecoPreenchido(endereco)) {
            return carregarResumoEntrega(req, res, {
                endereco,
                modo: 'editar',
                erroEntrega:
                    'Preencha todos os campos obrigatórios.'
            });
        }

        db.run(
            `INSERT INTO enderecos_clientes (
                cliente_id,
                nome,
                cpf,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(cliente_id) DO UPDATE SET
                nome = excluded.nome,
                cpf = excluded.cpf,
                cep = excluded.cep,
                endereco = excluded.endereco,
                numero = excluded.numero,
                complemento = excluded.complemento,
                bairro = excluded.bairro,
                cidade = excluded.cidade,
                estado = excluded.estado`,
            [
                clienteId,
                endereco.nome,
                endereco.cpf,
                endereco.cep,
                endereco.endereco,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.estado
            ],
            erro => {
                if (erro) {
                    console.error(erro);

                    return res.status(500).send(
                        'Não foi possível salvar o endereço.'
                    );
                }

                delete req.session.enderecoEntrega;

                req.session.save(erroSessao => {
                    if (erroSessao) {
                        console.error(erroSessao);

                        return res.status(500).send(
                            'Erro ao atualizar a sessão.'
                        );
                    }

                    res.redirect('/carrinho/entrega');
                });
            }
        );
    }
);

// =====================================================
// CONTINUAR PARA O PAGAMENTO
// =====================================================

appCarrinho.post(
    '/entrega/continuar',
    exigirLoginEntrega,
    (req, res) => {
        buscarEnderecoCliente(
            req.session.clienteId,
            (erro, endereco) => {
                if (erro) {
                    console.error(erro);

                    return res.status(500).send(
                        'Erro ao verificar o endereço.'
                    );
                }

                if (!enderecoPreenchido(endereco)) {
                    return res.redirect(
                        '/carrinho/entrega'
                    );
                }

                res.redirect('/carrinho/pagamento');
            }
        );
    }
);

// =====================================================
// INICIAR FINALIZAÇÃO DA COMPRA
// =====================================================

appCarrinho.get('/finalizar', (req, res) => {
    const carrinho = obterCarrinho(req);

    if (!carrinho.length) {
        return res.redirect('/carrinho');
    }

    if (!req.session.clienteId) {
        req.session.retornoAposLogin =
            '/carrinho/entrega';

        return req.session.save(erro => {
            if (erro) {
                console.error(erro);

                return res.status(500).send(
                    'Erro ao iniciar a compra.'
                );
            }

            res.redirect('/cliente/login');
        });
    }

    res.redirect('/carrinho/entrega');
});

// =====================================================
// PAGAMENTO — ETAPA 3 DO CHECKOUT
// =====================================================

appCarrinho.get('/pagamento', (req, res) => {
    if (!req.session.clienteId) {
        req.session.retornoAposLogin = '/carrinho/pagamento';

        return req.session.save(erro => {
            if (erro) {
                console.error(erro);

                return res.status(500).send(
                    'Erro ao iniciar o pagamento.'
                );
            }

            res.redirect('/cliente/login');
        });
    }

    const carrinho = obterCarrinho(req);

    if (!carrinho.length) {
        return res.redirect('/carrinho');
    }

    buscarEnderecoCliente(
        req.session.clienteId,
        (erroEndereco, endereco) => {
            if (erroEndereco) {
                console.error(erroEndereco);

                return res.status(500).send(
                    'Erro ao verificar o endereço.'
                );
            }

            if (!enderecoPreenchido(endereco)) {
                return res.redirect('/carrinho/entrega');
            }

            buscarProdutos(
                carrinho.map(item => item.id),
                (erro, produtosBanco) => {
                    if (erro) {
                        console.error(erro);

                        return res.status(500).send(
                            'Erro ao carregar o pagamento.'
                        );
                    }

                    const itens = montarItens(
                        carrinho,
                        produtosBanco
                    );

                    if (!itens.length) {
                        return res.redirect('/carrinho');
                    }

                    const total = calcularTotal(itens);

                    res.render('cliente/pagamento', {
                        itens,
                        total
                    });
                }
            );
        }
    );
});

// =====================================================
// GUARDAR MÉTODO DE PAGAMENTO DEMONSTRATIVO
// =====================================================

appCarrinho.post('/pagamento/continuar', (req, res) => {
    if (!req.session.clienteId) {
        return res.redirect('/cliente/login');
    }

    if (!obterCarrinho(req).length) {
        return res.redirect('/carrinho');
    }

    const metodo = req.body.metodo;

    if (!['cartao', 'pix'].includes(metodo)) {
        return res.redirect('/carrinho/pagamento');
    }

    const parcelas = metodo === 'cartao'
        ? Number(req.body.parcelas)
        : 1;

    if (
        !Number.isInteger(parcelas) ||
        parcelas < 1 ||
        parcelas > 10
    ) {
        return res.redirect('/carrinho/pagamento');
    }

    // Apenas método e parcelas são salvos.
    // Não armazenar número de cartão, validade ou CVC.
    req.session.pagamento = {
        metodo,
        parcelas
    };

    req.session.save(erro => {
        if (erro) {
            console.error(erro);

            return res.status(500).send(
                'Erro ao salvar a forma de pagamento.'
            );
        }

        res.redirect('/carrinho/revisao');
    });
});

// =====================================================
// REVISÃO — ETAPA 4 DO CHECKOUT
// =====================================================

appCarrinho.get('/revisao', (req, res) => {
    if (!req.session.clienteId) {
        req.session.retornoAposLogin = '/carrinho/revisao';

        return req.session.save(erro => {
            if (erro) {
                console.error(erro);

                return res.status(500).send(
                    'Erro ao acessar a revisão.'
                );
            }

            res.redirect('/cliente/login');
        });
    }

    const carrinho = obterCarrinho(req);

    if (!carrinho.length) {
        return res.redirect('/carrinho');
    }

    const pagamento = req.session.pagamento;

    if (
        !pagamento ||
        !['cartao', 'pix'].includes(pagamento.metodo) ||
        !Number.isInteger(pagamento.parcelas) ||
        pagamento.parcelas < 1 ||
        pagamento.parcelas > 10
    ) {
        return res.redirect('/carrinho/pagamento');
    }

    buscarEnderecoCliente(
        req.session.clienteId,
        (erroEndereco, endereco) => {
            if (erroEndereco) {
                console.error(erroEndereco);

                return res.status(500).send(
                    'Erro ao consultar o endereço.'
                );
            }

            if (!enderecoPreenchido(endereco)) {
                return res.redirect('/carrinho/entrega');
            }

            buscarProdutos(
                carrinho.map(item => item.id),
                (erroProdutos, produtosBanco) => {
                    if (erroProdutos) {
                        console.error(erroProdutos);

                        return res.status(500).send(
                            'Erro ao carregar os produtos.'
                        );
                    }

                    const itens = montarItens(
                        carrinho,
                        produtosBanco
                    );

                    if (!itens.length) {
                        return res.redirect('/carrinho');
                    }

                    const total = calcularTotal(itens);

                    res.render('cliente/revisao', {
                        endereco,
                        pagamento,
                        itens,
                        total
                    });
                }
            );
        }
    );
});

// =====================================================
// FINALIZAR PEDIDO — DEMONSTRAÇÃO
// =====================================================

appCarrinho.post('/revisao/finalizar', (req, res) => {
    if (!req.session.clienteId) {
        return res.redirect('/cliente/login');
    }

    const carrinho = obterCarrinho(req);

    if (!carrinho.length) {
        return res.redirect('/carrinho');
    }

    const pagamento = req.session.pagamento;

    if (
        !pagamento ||
        !['cartao', 'pix'].includes(pagamento.metodo) ||
        !Number.isInteger(pagamento.parcelas) ||
        pagamento.parcelas < 1 ||
        pagamento.parcelas > 10
    ) {
        return res.redirect('/carrinho/pagamento');
    }

    buscarEnderecoCliente(
        req.session.clienteId,
        (erroEndereco, endereco) => {
            if (erroEndereco) {
                console.error(erroEndereco);

                return res.status(500).send(
                    'Erro ao verificar o endereço.'
                );
            }

            if (!enderecoPreenchido(endereco)) {
                return res.redirect('/carrinho/entrega');
            }

            buscarProdutos(
                carrinho.map(item => item.id),
                (erroProdutos, produtosBanco) => {
                    if (erroProdutos) {
                        console.error(erroProdutos);

                        return res.status(500).send(
                            'Erro ao verificar os produtos.'
                        );
                    }

                    const itens = montarItens(
                        carrinho,
                        produtosBanco
                    );

                    if (!itens.length) {
                        return res.redirect('/carrinho');
                    }

                    const total = calcularTotal(itens);

                    // Pedido apenas demonstrativo.
                    // Nenhuma cobrança ou alteração de estoque.
                    req.session.pedidoDemonstrativo = {
                        numero: 'VH' + crypto.randomInt(1000000, 10000000),
                        data: new Date().toISOString(),


                        endereco: {
                            nome: endereco.nome,
                            endereco: endereco.endereco,
                            numero: endereco.numero,
                            complemento: endereco.complemento,
                            bairro: endereco.bairro,
                            cidade: endereco.cidade,
                            estado: endereco.estado,
                            cep: endereco.cep
                        },
                        pagamento: {
                            metodo: pagamento.metodo,
                            parcelas: pagamento.parcelas
                        },
                        itens: itens.map(item => ({
                            id: item.produto.id,
                            nome: item.produto.nome,
                            quantidade: item.quantidade,
                            valor: Number(item.produto.valor),
                            subtotal: item.subtotal
                        })),
                        total
                    };

                    req.session.carrinho = [];
                    delete req.session.pagamento;

                    req.session.save(erroSessao => {
                        if (erroSessao) {
                            console.error(erroSessao);

                            return res.status(500).send(
                                'Erro ao finalizar a demonstração.'
                            );
                        }

                        res.redirect('/carrinho/aprovado');
                    });
                }
            );
        }
    );
});

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

// =====================================================
// EXPORTAR ROTAS
// =====================================================

module.exports = appCarrinho;
