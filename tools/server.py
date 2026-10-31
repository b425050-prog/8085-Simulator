"""Optional Python 3 launcher when Node.js is not installed."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser

ROOT = Path(__file__).resolve().parent.parent

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, *args):
        pass

if __name__ == '__main__':
    for port in range(8085, 8105):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            continue
    else:
        raise SystemExit('Ports 8085-8104 are busy. Close an older simulator window.')
    url = f'http://127.0.0.1:{port}'
    print(f'\n8085 Bench\n\n  Local: {url}\n  Files: {ROOT}\n\nKeep this window open. Press Ctrl+C to stop.\n', flush=True)
    if '--open' in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
