const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let rawPath = req.url.split('?')[0];
  let reqPath;
  try {
    reqPath = decodeURIComponent(rawPath);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  // 1. Block dotfiles / hidden directories (.git, .claude, etc.)
  const segments = reqPath.split('/').filter(Boolean);
  if (segments.some(seg => seg.startsWith('.'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 2. Block sensitive internal directories and non-public configs
  if (
    reqPath.startsWith('/tools/') ||
    reqPath === '/tools' ||
    reqPath.startsWith('/node_modules/') ||
    reqPath === '/slug_topic_map.json' ||
    reqPath === '/PRODUCT.md'
  ) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (reqPath.endsWith('/')) {
    reqPath += 'index.html';
  }

  let filePath = path.join(ROOT, reqPath);
  const relPath = path.relative(ROOT, filePath);

  // 3. Strict directory traversal protection
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try appending .html
      const htmlPath = filePath + '.html';
      const relHtmlPath = path.relative(ROOT, htmlPath);
      if (relHtmlPath.startsWith('..') || path.isAbsolute(relHtmlPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(htmlPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(htmlPath, res);
        } else {
          // Serve 404.html
          const notFoundPath = path.join(ROOT, '404.html');
          fs.readFile(notFoundPath, (err3, data) => {
            res.writeHead(404, {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Content-Type-Options': 'nosniff',
              'X-Frame-Options': 'SAMEORIGIN'
            });
            res.end(err3 ? 'Not Found' : data);
          });
        }
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(content);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
