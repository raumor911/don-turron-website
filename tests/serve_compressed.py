"""Static benchmark server with gzip negotiation, matching CDN text compression.

Both baseline and candidate use this exact handler. Images and WOFF2 are already
compressed and pass through unchanged. This is a test server, not a deployment.
"""
import argparse
import gzip
import io
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial

class CompressedHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        if self.path=='/api/catalog':
            body=b'{"error":"catalog_unavailable"}'
            self.send_response(503)
            self.send_header('Content-Type','application/json')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def send_head(self):
        path=Path(self.translate_path(self.path))
        if path.is_dir():
            path=path/'index.html'
        if path.is_file() and path.suffix in {'.html','.css','.js','.mjs','.json','.xml','.svg','.txt'} and 'gzip' in self.headers.get('Accept-Encoding',''):
            body=gzip.compress(path.read_bytes(),compresslevel=6,mtime=0)
            self.send_response(200)
            self.send_header('Content-Type',self.guess_type(str(path)))
            self.send_header('Content-Encoding','gzip')
            self.send_header('Vary','Accept-Encoding')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,required=True)
    parser.add_argument('--directory',default='.')
    args=parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1',args.port),partial(CompressedHandler,directory=args.directory)) as server:
        server.serve_forever()
