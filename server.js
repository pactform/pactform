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

const EXTENSION_GUARD_SCRIPT = `<script>(function(){try{var d=Object.getOwnPropertyDescriptor(window,'fetch');if(d&&d.get&&!d.set&&d.configurable){Object.defineProperty(window,'fetch',{get:d.get,set:function(){},configurable:true,enumerable:d.enumerable});}}catch(e){}window.addEventListener('error',function(ev){var f=(ev&&ev.filename)||'';var s=(ev&&ev.error&&ev.error.stack)||'';if(f.indexOf('chrome-extension://')===0||f.indexOf('moz-extension://')===0||s.indexOf('chrome-extension://')!==-1||s.indexOf('moz-extension://')!==-1){ev.preventDefault();ev.stopImmediatePropagation();}},true);})();</script>`;

// Serve HTML pages with a defensive guard against browser extensions mutating getter-only window.fetch
app.get(/^\/(?:|.*\.html)$/, (req, res, next) => {
  const reqPath = req.path === '/' ? 'index.html' : req.path.replace(/^\/+/, '');
  const candidates = [
    path.resolve(rootDir, reqPath),
    path.resolve(pactformDir, reqPath),
  ];

  for (const filePath of candidates) {
    if (
      (filePath.startsWith(rootDir + path.sep) || filePath.startsWith(pactformDir + path.sep)) &&
      fs.existsSync(filePath) &&
      fs.statSync(filePath).isFile()
    ) {
      let html = fs.readFileSync(filePath, 'utf8');
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}\n    ${EXTENSION_GUARD_SCRIPT}`);
      } else {
        html = `${EXTENSION_GUARD_SCRIPT}\n${html}`;
      }
      res.type('html').send(html);
      return;
    }
  }
  next();
});

// Serve primary static files from repository root (no-cache on editable JS/HTML so updates show immediately)
app.use(express.static(rootDir, {
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

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
