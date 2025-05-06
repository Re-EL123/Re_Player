require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {google} = require('googleapis');

const app = express();
app.use(cors());

const drive = google.drive({ version: 'v3', auth: process.env.API_KEY });

app.get('/api/files', async (req, res) => {
  try {
    const folderId = process.env.FOLDER_ID;
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'audio/' and trashed=false`,
      fields: 'files(id, name, owners(displayName))',
      pageSize: 1000,
    });

    const files = response.data.files.map(f => ({
      id: f.id,
      name: f.name,
      uploader: (f.owners && f.owners.length) ? f.owners[0].displayName : 'Unknown'
    }));

    res.json(files);
  } catch (err) {
    console.error('Drive API error', err);
    res.status(500).json({ error: 'Failed to list files.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Re-Player backend listening on http://localhost:${PORT}`)
);
