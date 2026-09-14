import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
// Run the BFF Proxy on port 5002
const PORT = process.env.PORT || 5002;
// Your real backend runs on port 5001
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

app.use((req, res, next) => {
    // The incoming URL from Nginx is going to be something like: /api/v1/musu?_L2FkbW...
    const marker = 'musu?_';
    const markerIndex = req.url.indexOf(marker);
    
    if (markerIndex !== -1) {
        try {
            // Extract everything after the marker
            const encoded = req.url.substring(markerIndex + marker.length);
            // Decode it: URL Decode -> Base64 Decode -> UTF-8
            const base64Str = decodeURIComponent(encoded);
            const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
            
            // Reconstruct the real URL by replacing the obfuscated part with the decoded part
            const originalPrefix = req.url.substring(0, markerIndex);
            req.url = originalPrefix + (decoded.startsWith('/') ? decoded.substring(1) : decoded);
            
            console.log(`[Proxy] Decoded request to: ${req.url}`);
        } catch (e) {
            console.error('[Proxy] Failed to decode URL:', req.url, e);
        }
    }
    next();
});

// Proxy everything to the real backend
app.use('/', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    ws: true, // proxy websockets
}));

app.listen(PORT, () => {
    console.log(`[Proxy] Node BFF server is running on port ${PORT}`);
    console.log(`[Proxy] Forwarding to backend: ${BACKEND_URL}`);
});
