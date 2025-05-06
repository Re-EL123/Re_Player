const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Initialize Google Drive API client
const drive = google.drive({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY,
});

// API endpoint to fetch files from Google Drive folder
app.get('/api/files', async (req, res) => {
  try {
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`,
      fields: 'files(id, name)',
    });

    const files = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      uploader: 'Re-EL Branding',
    }));

    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
