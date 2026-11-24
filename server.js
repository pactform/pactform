const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const rootDir = __dirname;
const pactformDir = path.join(__dirname, 'pactform');

// Block access to server source and config files
app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json', '/metadata.json'];
  if (blocked.includes(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

// Serve primary static files from repository root
app.use(express.static(rootDir, { index: 'index.html' }));

// Fallback to /pactform directory for pages/assets present there (e.g. projects.html, shipping.html, scroll-reveal)
if (fs.existsSync(pactformDir)) {
  app.use(express.static(pactformDir));
}

// Fallback from .jpg/.jpeg/.png to .webp when only optimized webp exists in root or pactform/
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const decodedPath = decodeURIComponent(req.path);
  if (!/\.(jpe?g|png)$/i.test(decodedPath)) return next();

  const relWebp = decodedPath.replace(/^\/+/, '').replace(/\.(jpe?g|png)$/i, '.webp');
  const candidates = [
    path.resolve(rootDir, relWebp),
    path.resolve(pactformDir, relWebp),
  ];

  for (const candidate of candidates) {
    if (
      (candidate.startsWith(rootDir + path.sep) || candidate.startsWith(pactformDir + path.sep)) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      return res.sendFile(candidate);
    }
  }
  next();
});

app.listen(PORT, HOST, () => {
  console.log(`Pactform static server running at http://${HOST}:${PORT}`);
});
