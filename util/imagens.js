
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// =====================================================
// PASTA DE UPLOADS
// =====================================================

const pastaUploads = path.join(
    __dirname,
    '../public/uploads'
);

fs.mkdirSync(pastaUploads, {
    recursive: true
});

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function nomeSeguro(originalname) {
    const nome = path.basename(
        originalname.replace(/\\/g, '/')
    );

    const seguro = nome
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .trim();

    if (!seguro || seguro === '.' || seguro === '..') {
        throw new Error('Nome de arquivo inválido.');
    }

    return seguro;
}

function hashArquivo(caminho) {
    const hash = crypto.createHash('sha256');

    hash.update(fs.readFileSync(caminho));

    return hash.digest('hex');
}

function buscarArquivoIdentico(caminhoNovo) {
    const tamanhoNovo = fs.statSync(caminhoNovo).size;
    const hashNovo = hashArquivo(caminhoNovo);

    const arquivos = fs.readdirSync(pastaUploads);

    for (const arquivo of arquivos) {
        const caminhoExistente = path.join(
            pastaUploads,
            arquivo
        );

        if (caminhoExistente === caminhoNovo) {
            continue;
        }

        const info = fs.statSync(caminhoExistente);

        if (!info.isFile()) {
            continue;
        }

        if (info.size !== tamanhoNovo) {
            continue;
        }

        if (hashArquivo(caminhoExistente) === hashNovo) {
            return arquivo;
        }
    }

    return null;
}

// =====================================================
// CONFIGURAÇÃO DO MULTER
// =====================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, pastaUploads);
    },

    filename: function (req, file, cb) {
        try {
            const original = nomeSeguro(file.originalname);

            const extensao = path.extname(original);
            const base = path.basename(original, extensao);

            let nome = original;
            let contador = 2;

            // Evita sobrescrever arquivos existentes
            while (
                fs.existsSync(
                    path.join(pastaUploads, nome)
                )
            ) {
                nome = `${base} (${contador})${extensao}`;
                contador++;
            }

            cb(null, nome);

        } catch (erro) {
            cb(erro);
        }
    }

});

// =====================================================
// TIPOS DE ARQUIVOS PERMITIDOS
// =====================================================

const fileFilter = function (req, file, cb) {

    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4'
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                'Arquivo não permitido. Use JPG, PNG, WEBP ou MP4.'
            ),
            false
        );
    }
};

// =====================================================
// MULTER ORIGINAL
// =====================================================

const multerUpload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 50 * 1024 * 1024
    }

});

// =====================================================
// REUTILIZAÇÃO AUTOMÁTICA DE ARQUIVOS
// =====================================================

function verificarDuplicados(req, res, next) {

    try {
        const arquivos = [];

        if (req.file) {
            arquivos.push(req.file);
        }

        if (req.files) {

            if (Array.isArray(req.files)) {
                arquivos.push(...req.files);

            } else {
                for (const grupo of Object.values(req.files)) {
                    arquivos.push(...grupo);
                }
            }
        }

        for (const arquivo of arquivos) {

            const caminhoNovo = arquivo.path;

            const existente = buscarArquivoIdentico(
                caminhoNovo
            );

            if (existente) {

                // Apaga apenas a cópia recém-enviada
                fs.unlinkSync(caminhoNovo);

                // Faz a rota utilizar o arquivo original
                arquivo.filename = existente;
                arquivo.path = path.join(
                    pastaUploads,
                    existente
                );

                arquivo.size = fs.statSync(
                    arquivo.path
                ).size;
            }
        }

        next();

    } catch (erro) {
        next(erro);
    }
}

// =====================================================
// EXPORTAÇÃO COMPATÍVEL COM AS ROTAS EXISTENTES
// =====================================================

const upload = {

    single: function (campo) {
        return [
            multerUpload.single(campo),
            verificarDuplicados
        ];
    },

    fields: function (campos) {
        return [
            multerUpload.fields(campos),
            verificarDuplicados
        ];
    },

    array: function (campo, quantidade) {
        return [
            multerUpload.array(campo, quantidade),
            verificarDuplicados
        ];
    },

    none: function () {
        return multerUpload.none();
    }

};

module.exports = upload;

