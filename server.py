#!/usr/bin/env python3
"""
TidyTribe – Local Dev Server
────────────────────────────────────────
Simple static file server for local development.
All data is now stored in Firebase Firestore — no local API needed.

Usage:
    python3 server.py          # serves on port 8000
    python3 server.py 3000     # serves on port 3000
"""

import os
import socket
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

# Serve files from the project root
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Static file handler with no-cache headers for development."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


def get_local_ip():
    """Try to determine the LAN IP for phone access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


if __name__ == '__main__':
    ip = get_local_ip()
    print()
    print('  🏠  TidyTribe')
    print('  ────────────────────────')
    print(f'  Local:   http://localhost:{PORT}')
    print(f'  Phone:   http://{ip}:{PORT}')
    print()
    print('  Data stored in Firebase Firestore ☁️')
    print('  Press Ctrl+C to stop.\n')

    HTTPServer(('', PORT), NoCacheHandler).serve_forever()
