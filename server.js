const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ✅ Log startup info
console.log("✅ Starting Re-Player backend...");
console.log("✅ GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("✅ GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.slice(0, 4) + "…" : "Missing");
console.log("✅ GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
console.log("✅ FOLDER_ID:", process.env.FOLDER_ID);

// 🔐 OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 🎧 Read-only Drive scope
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

// 🔁 Refresh token support
let accessTokenReady = false;

// 📍 Step 1: Redirect to Google for user auth
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent" // always show consent to get refresh token
  });
  res.redirect(url);
});

// 📍 Step 2: OAuth2 callback route
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    accessTokenReady = true;
    console.log("🟢 Auth successful. Tokens received.");
    res.send("✅ Auth complete. You can close this window and return to Re-Player.");
  } catch (err) {
    console.error("🔴 OAuth2 error:", err);
    res.status(500).send("Authentication failed.");
  }
});

// 📂 Step 3: List audio files from the shared folder
app.get("/api/files", async (req, res) => {
  if (!accessTokenReady) {
    return res.status(401).json({ error: "Google Drive not authenticated. Visit /auth to authorize." });
  }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    const response = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`,
      fields: "files(id, name, owners(displayName))",
      pageSize: 1000
    });

    const files = (response.data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      uploader: file.owners?.[0]?.displayName || "Unknown"
    }));

    res.json(files);
  } catch (err) {
    console.error("❌ Drive API error:", err);
    res.status(500).json({ error: "Failed to list files", details: err.message });
  }
});

// 🔍 Health check route
app.get("/", (req, res) => res.send("✅ Re-Player backend is running."));

app.listen(PORT, () => {
  console.log(`🚀 Listening on http://localhost:${PORT}`);
});
