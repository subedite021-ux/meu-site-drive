const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ADICIONE ESTA LINHA ABAIXO para servir o seu site.html na página principal:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'site.html'));
});

const upload = multer({ dest: 'uploads/' });

const KEY_FILE_PATH = path.join(__dirname, 'meu-serve-507114-05d64464b7ac.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });
const PASTA_DESTINO_ID = ''; 

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const mimeType = req.file.mimetype;

        const fileMetadata = { name: fileName };
        if (PASTA_DESTINO_ID) {
            fileMetadata.parents = [PASTA_DESTINO_ID];
        }

        const media = {
            mimeType: mimeType,
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink, size',
        });

        try {
            await drive.permissions.create({
                fileId: response.data.id,
                requestBody: { role: 'reader', type: 'anyone' },
            });
        } catch (permError) {
            console.log('Aviso ao definir permissão:', permError.message);
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            file: {
                id: response.data.id,
                name: response.data.name,
                url: response.data.webContentLink || response.data.webViewLink,
                size: req.file.size
            }
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro interno ao enviar para o Google Drive.' });
    }
});

app.get('/files', async (req, res) => {
    try {
        const response = await drive.files.list({
            pageSize: 50,
            fields: 'files(id, name, webViewLink, webContentLink, size)',
        });
        
        res.json({
            success: true,
            files: response.data.files
        });
    } catch (error) {
        console.error('Erro ao listar:', error);
        res.status(500).json({ error: 'Erro ao buscar arquivos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});