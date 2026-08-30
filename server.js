const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ID da sua pasta do Google Drive (Cole o seu ID aqui entre as aspas)
const FOLDER_ID = '1jHRAPNRA3-5hyy5CiJXLw3JZKgE5rVx1';

function getDriveService() {
    if (!process.env.GOOGLE_CREDENTIALS) {
        throw new Error('A variável de ambiente GOOGLE_CREDENTIALS não está configurada.');
    }

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    return google.drive({ version: 'v3', auth });
}

app.use(express.static(__dirname));

// Rota de Upload
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const drive = getDriveService();

        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const fileMetadata = {
            name: req.file.originalname,
            parents: [FOLDER_ID]
        };

        const media = {
            mimeType: req.file.mimetype,
            body: bufferStream
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink'
        });

        res.status(200).json({
            message: 'Arquivo enviado com sucesso para o Google Drive!',
            file: response.data
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao enviar arquivo para o Storage: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
