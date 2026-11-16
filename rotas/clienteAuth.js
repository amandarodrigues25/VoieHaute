
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../banco/database');

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function criarHash(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(senha, salt, 64).toString('hex');

    return `${salt}:${hash}`;
}

function verificarSenha(senha, senhaArmazenada) {
    try {
        const [salt, hashOriginal] = senhaArmazenada.split(':');

        if (!salt || !hashOriginal) return false;

        const hashDigitado = crypto.scryptSync(senha, salt, 64);
        const hashSalvo = Buffer.from(hashOriginal, 'hex');

        return hashDigitado.length === hashSalvo.length &&
            crypto.timingSafeEqual(hashDigitado, hashSalvo);
    } catch {
        return false;
    }
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    for (let tamanho = 9; tamanho < 11; tamanho++) {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(cpf[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;
        const digito = resto === 10 ? 0 : resto;

        if (digito !== Number(cpf[tamanho])) {
            return false;
        }
    }

    return true;
}

function destinoSeguro(destino) {
    if (
        typeof destino === 'string' &&
        destino.startsWith('/') &&
        !destino.startsWith('//') &&
        !destino.startsWith('/\\')
    ) {
        return destino;
    }

    return '/';
}

function renderCadastro(res, dados = {}, erro = null) {
    res.render('cliente/cadastro', { dados, erro });
}

function renderLogin(res, email = '', erro = null) {
    res.render('cliente/login', { email, erro });
}

// =====================================================
// TELA DE CADASTRO
// =====================================================

router.get('/cadastro', (req, res) => {
    if (req.session.clienteId) {
        return res.redirect('/');
    }

    renderCadastro(res);
});

// =====================================================
// CADASTRAR CLIENTE
// =====================================================

router.post('/cadastro', (req, res) => {
    const dados = {
        nome: String(req.body.nome || '').trim(),
        cpf: String(req.body.cpf || '').replace(/\D/g, ''),
        nascimento: String(req.body.nascimento || '').trim(),
        email: String(req.body.email || '').trim().toLowerCase(),
        telefone: String(req.body.telefone || '').replace(/\D/g, '')
    };

    const senha = String(req.body.senha || '');
    const confirmarSenha = String(req.body.confirmarSenha || '');

    function erroCadastro(mensagem) {
        return renderCadastro(res, dados, mensagem);
    }

    if (Object.values(dados).some(valor => !valor)) {
        return erroCadastro('Preencha todos os campos obrigatórios.');
    }

    if (dados.nome.length < 3) {
        return erroCadastro('Informe seu nome completo.');
    }

    if (!cpfValido(dados.cpf)) {
        return erroCadastro('Informe um CPF válido.');
    }

    if (!emailValido(dados.email)) {
        return erroCadastro('Informe um e-mail válido.');
    }

    if (!/^\d{10,11}$/.test(dados.telefone)) {
        return erroCadastro('Informe um telefone válido com DDD.');
    }

    const nascimento = new Date(`${dados.nascimento}T12:00:00`);

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(dados.nascimento) ||
        Number.isNaN(nascimento.getTime()) ||
        nascimento.toISOString().slice(0, 10) !== dados.nascimento ||
        nascimento > new Date()
    ) {
        return erroCadastro('Informe uma data de nascimento válida.');
    }

    if (senha.length < 8) {
        return erroCadastro('A senha deve ter pelo menos 8 caracteres.');
    }

    if (senha !== confirmarSenha) {
        return erroCadastro('As senhas não coincidem.');
    }

    if (req.body.termos !== 'on') {
        return erroCadastro('Você precisa aceitar os termos para continuar.');
    }

    const senhaHash = criarHash(senha);

    db.run(
        `INSERT INTO clientes
         (nome, cpf, nascimento, email, telefone, senha_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            dados.nome,
            dados.cpf,
            dados.nascimento,
            dados.email,
            dados.telefone,
            senhaHash
        ],
        function (erro) {
            if (erro) {
                if (erro.code === 'SQLITE_CONSTRAINT') {
                    return erroCadastro(
                        'Este CPF ou e-mail já está cadastrado.'
                    );
                }

                console.error(erro);
                return res.status(500).send(
                    'Erro ao cadastrar cliente.'
                );
            }

            const clienteId = this.lastID;

            // Renovar a sessão sem perder os produtos da sacola.
            const carrinho = req.session.carrinho || [];
            const enderecoEntrega = req.session.enderecoEntrega || null;
            const retorno = req.session.retornoAposLogin;

            req.session.regenerate(erroSessao => {
                if (erroSessao) {
                    console.error(erroSessao);
                    return res.status(500).send(
                        'Erro ao iniciar sessão.'
                    );
                }

                req.session.clienteId = clienteId;
                req.session.clienteNome = dados.nome;
                req.session.carrinho = carrinho;

                if (enderecoEntrega) {
                    req.session.enderecoEntrega = enderecoEntrega;
                }

                const destino = destinoSeguro(retorno);

                req.session.save(erroSalvar => {
                    if (erroSalvar) {
                        console.error(erroSalvar);
                        return res.status(500).send(
                            'Erro ao salvar sessão.'
                        );
                    }

                    res.redirect(destino);
                });
            });
        }
    );
});

// =====================================================
// TELA DE LOGIN
// =====================================================

router.get('/login', (req, res) => {
    if (req.session.clienteId) {
        return res.redirect('/');
    }

    renderLogin(res);
});


/* =====================================================
   TELA DE RECUPERAÇÃO DE SENHA
   ===================================================== */

router.get('/recuperar-senha', (req, res) => {
    if (req.session.clienteId) {
        return res.redirect('/');
    }

    res.render('cliente/recuperar-senha', {
        erro: null
    });
});


/* =====================================================
   ALTERAR SENHA DO CLIENTE
   ===================================================== */

router.post('/recuperar-senha', (req, res) => {
    const email = String(req.body.email || '')
        .trim()
        .toLowerCase();

    const senha = String(req.body.senha || '');
    const confirmarSenha = String(req.body.confirmarSenha || '');

    function mostrarErro(mensagem) {
        return res.render('cliente/recuperar-senha', {
            erro: mensagem
        });
    }

    // Verificar campos obrigatórios
    if (!email || !senha || !confirmarSenha) {
        return mostrarErro('Preencha todos os campos.');
    }

    // Validar e-mail
    if (!emailValido(email)) {
        return mostrarErro('Informe um e-mail válido.');
    }

    // Validar tamanho da senha
    if (senha.length < 8) {
        return mostrarErro(
            'A senha deve ter pelo menos 8 caracteres.'
        );
    }

    // Confirmar senha
    if (senha !== confirmarSenha) {
        return mostrarErro('As senhas não coincidem.');
    }

    // Procurar cliente pelo e-mail
    db.get(
        'SELECT id FROM clientes WHERE email = ?',
        [email],
        (erro, cliente) => {

            if (erro) {
                console.error(erro);
                return res.status(500).send(
                    'Erro ao consultar o banco de dados.'
                );
            }

            if (!cliente) {
                return mostrarErro(
                    'Nenhuma conta encontrada com este e-mail.'
                );
            }

            // Criar hash da nova senha
            const novaSenhaHash = criarHash(senha);

            // Atualizar senha no banco
            db.run(
                'UPDATE clientes SET senha_hash = ? WHERE id = ?',
                [novaSenhaHash, cliente.id],
                function (erro) {

                    if (erro) {
                        console.error(erro);
                        return res.status(500).send(
                            'Erro ao atualizar a senha.'
                        );
                    }

                    // Voltar para o login
                    return res.redirect('/cliente/login');
                }
            );
        }
    );
});


// =====================================================
// ENTRAR NA CONTA
// =====================================================

router.post('/login', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!email || !senha) {
        return renderLogin(
            res,
            email,
            'Preencha seu e-mail e sua senha.'
        );
    }

    db.get(
        'SELECT * FROM clientes WHERE email = ?',
        [email],
        (erro, cliente) => {
            if (erro) {
                console.error(erro);
                return res.status(500).send(
                    'Erro ao consultar cliente.'
                );
            }

            if (
                !cliente ||
                !verificarSenha(senha, cliente.senha_hash)
            ) {
                return renderLogin(
                    res,
                    email,
                    'E-mail ou senha incorretos.'
                );
            }

            const carrinho = req.session.carrinho || [];
            const enderecoEntrega = req.session.enderecoEntrega || null;
            const retorno = req.session.retornoAposLogin;

            req.session.regenerate(erroSessao => {
                if (erroSessao) {
                    console.error(erroSessao);
                    return res.status(500).send(
                        'Erro ao iniciar sessão.'
                    );
                }

                req.session.clienteId = cliente.id;
                req.session.clienteNome = cliente.nome;
                req.session.carrinho = carrinho;

                if (enderecoEntrega) {
                    req.session.enderecoEntrega = enderecoEntrega;
                }

                const destino = destinoSeguro(retorno);

                req.session.save(erroSalvar => {
                    if (erroSalvar) {
                        console.error(erroSalvar);
                        return res.status(500).send(
                            'Erro ao salvar sessão.'
                        );
                    }

                    res.redirect(destino);
                });
            });
        }
    );
});

// =====================================================
// SAIR DA CONTA
// =====================================================

router.post('/logout', (req, res) => {
    // Preserva a sacola, mas não os dados pessoais.
    const carrinho = req.session.carrinho || [];

    req.session.regenerate(erro => {
        if (erro) {
            console.error(erro);
            return res.status(500).send(
                'Erro ao sair da conta.'
            );
        }

        req.session.carrinho = carrinho;

        req.session.save(erroSalvar => {
            if (erroSalvar) {
                console.error(erroSalvar);
                return res.status(500).send(
                    'Erro ao salvar sessão.'
                );
            }

            res.redirect('/');
        });
    });
});


/* =====================================================
   MINHA CONTA — DADOS PESSOAIS
   ===================================================== */

// Exigir que o cliente esteja autenticado
function exigirClienteLogado(req, res, next) {
    if (!req.session || !req.session.clienteId) {
        return res.redirect('/cliente/login');
    }

    next();
}

// Consultar os dados do cliente
router.get('/perfil', exigirClienteLogado, (req, res) => {
    db.get(
        `SELECT id, nome, email, telefone, nascimento, cpf
         FROM clientes
         WHERE id = ?`,
        [req.session.clienteId],
        (erro, cliente) => {
            if (erro) {
                console.error(erro);
                return res.status(500).send('Erro ao carregar o perfil.');
            }

            if (!cliente) {
                return res.redirect('/cliente/login');
            }

            return res.render('cliente/perfil', {
                cliente,
                editando: req.query.editar === '1',
                erro: null,
                sucesso: req.query.salvo === '1'
            });
        }
    );
});

// Salvar alterações dos dados pessoais
router.post('/perfil', exigirClienteLogado, (req, res) => {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const telefone = String(req.body.telefone || '').replace(/\D/g, '');

    function mostrarErro(mensagem) {
        db.get(
            `SELECT id, nome, email, telefone, nascimento, cpf
             FROM clientes WHERE id = ?`,
            [req.session.clienteId],
            (erro, cliente) => {
                if (erro || !cliente) {
                    return res.status(500).send('Erro ao consultar cliente.');
                }

                return res.status(400).render('cliente/perfil', {
                    cliente: { ...cliente, nome, email, telefone },
                    editando: true,
                    erro: mensagem,
                    sucesso: false
                });
            }
        );
    }

    if (nome.length < 3) {
        return mostrarErro('Informe seu nome completo.');
    }

    if (!emailValido(email)) {
        return mostrarErro('Informe um e-mail válido.');
    }

    if (!/^\d{10,11}$/.test(telefone)) {
        return mostrarErro('Informe um telefone válido com DDD.');
    }

    db.run(
        `UPDATE clientes
         SET nome = ?, email = ?, telefone = ?
         WHERE id = ?`,
        [nome, email, telefone, req.session.clienteId],
        function (erro) {
            if (erro) {
                if (erro.code === 'SQLITE_CONSTRAINT') {
                    return mostrarErro('Este e-mail já está cadastrado.');
                }

                console.error(erro);
                return res.status(500).send('Erro ao atualizar os dados.');
            }

            req.session.clienteNome = nome;

            req.session.save(erroSessao => {
                if (erroSessao) {
                    console.error(erroSessao);
                    return res.status(500).send('Erro ao salvar a sessão.');
                }

                return res.redirect('/cliente/perfil?salvo=1');
            });
        }
    );
});


module.exports = router;
