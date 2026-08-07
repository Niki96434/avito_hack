import { createReadStream, existsSync, statSync } from 'node:fs'
import http from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

interface ServerOptions {
  port: number
  host: string
  rootDir: string
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.ts': 'text/typescript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

export function createStaticServer(options: ServerOptions): http.Server {
  const { rootDir, host, port } = options

  return http.createServer((request, response) => {
    const rawPath = decodeURIComponent((request.url || '/').split('?')[0])
    const requested = rawPath === '/' ? '/index.html' : rawPath
    const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '')
    let filePath = join(rootDir, safePath)

    if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }

    if (statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html')
    }

    if (!existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }

    const ext = extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': 'no-store',
    })

    createReadStream(filePath).pipe(response)
  })
}

function main(): void {
  const { values } = parseArgs({
    options: {
      port: {
        type: 'string',
        short: 'p',
        default: process.env.PORT || '5173',
      },
      host: {
        type: 'string',
        short: 'h',
        default: process.env.HOST || '127.0.0.1',
      },
    },
  })

  const currentDir = fileURLToPath(new URL('.', import.meta.url))
  const rootDir = resolve(currentDir, '..')
  const port = Number(values.port ?? 5173)
  const host = values.host ?? '127.0.0.1'

  const server = createStaticServer({ rootDir, host, port })

  server.listen(port, host, () => {
    console.log(`Anti-Scam Trainer Server running at http://${host}:${port}`)
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
