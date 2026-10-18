const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
};

function getLanAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    Object.keys(interfaces).forEach((name) => {
        (interfaces[name] || []).forEach((entry) => {
            if (entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.')) {
                addresses.push(entry.address);
            }
        });
    });

    return Array.from(new Set(addresses)).sort((left, right) => {
        const score = (address) => {
            if (address.startsWith('192.168.')) return 0;
            if (address.startsWith('10.')) return 1;
            if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2;
            return 3;
        };
        return score(left) - score(right);
    });
}

const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end('Method Not Allowed');
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch (error) {
        response.writeHead(400);
        response.end('Bad Request');
        return;
    }

    if (pathname === '/__pengu/lan') {
        response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8'
        });
        response.end(JSON.stringify({ addresses: getLanAddresses(), port: PORT }));
        return;
    }

    if (pathname.split('/').some((part) => part.startsWith('.')) || pathname === '/server.js') {
        response.writeHead(404);
        response.end('Not Found');
        return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.resolve(ROOT, relativePath);
    if (!filePath.startsWith(ROOT + path.sep)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500);
            response.end(error.code === 'ENOENT' ? 'Not Found' : 'Server Error');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const headers = {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        };

        if (['.css', '.js', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.ico'].includes(ext)) {
            headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else if (ext === '.html') {
            headers['Cache-Control'] = 'no-cache';
        }

        response.writeHead(200, headers);
        response.end(request.method === 'HEAD' ? undefined : content);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('PenguStream local server: http://localhost:' + PORT);
    getLanAddresses().forEach((address) => {
        console.log('Phone remote access: http://' + address + ':' + PORT);
    });
});
