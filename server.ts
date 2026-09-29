import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Suppress unhandled EPIPE / ECONNRESET socket exceptions (common with aborted large base64 uploads)
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE' || err?.code === 'ECONNRESET') {
    console.warn(`[EvidenceTwin] Suppressed socket error (${err.code}):`, err.message);
    return;
  }
  console.error('[EvidenceTwin] Uncaught exception:', err);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Increase payload limit for raw forensic base64 image data
  app.use(express.json({ limit: '64mb' }));
  app.use(express.urlencoded({ extended: true, limit: '64mb' }));

  // Health check endpoint
  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({
      status: 'healthy',
      engine: 'EvidenceTwin OpenCV Real Computer Vision Engine',
      anti_fabrication: 'ACTIVE - FAIL CLOSED',
      timestamp: new Date().toISOString(),
    });
  });

  // OpenCV Computer Vision Evidence Pipeline Endpoint
  app.post(['/api/cv/analyze', '/api/cv/pipeline'], (req, res) => {
    req.socket.on('error', (err: any) => {
      console.warn('[EvidenceTwin] Client socket error suppressed:', err?.message);
    });
    res.socket?.on('error', (err: any) => {
      console.warn('[EvidenceTwin] Response socket error suppressed:', err?.message);
    });

    let isHandled = false;
    const safeSendJson = (statusCode: number, data: any) => {
      if (isHandled || res.headersSent || res.writableEnded) return;
      isHandled = true;
      try {
        res.status(statusCode).json(data);
      } catch (err: any) {
        console.warn('[EvidenceTwin] Suppressed res.json write error:', err?.message);
      }
    };

    try {
      const payload = JSON.stringify(req.body);

      // Invoke the OpenCV Python pipeline engine via stdio
      const venvPy = path.join(__dirname, '.venv', 'bin', 'python');
      const pyBin = fs.existsSync(venvPy) ? venvPy : 'python3';
      const py = spawn(pyBin, ['-m', 'backend.cv_engine.pipeline'], {
        cwd: __dirname,
      });

      let stdoutData = '';
      let stderrData = '';

      const timeoutId = setTimeout(() => {
        if (!isHandled) {
          try {
            py.kill('SIGKILL');
          } catch (e) {}
          safeSendJson(504, {
            status: 'PROCESSING_ERROR',
            gate: {
              passed: false,
              verdict: 'BLOCKED',
              status: 'PROCESSING_ERROR',
              reasons: ['Computer vision analysis timed out.'],
              required_actions: ['Ensure image is well lit and retry.']
            }
          });
        }
      }, 12000);

      py.stdin.on('error', (stdinErr: any) => {
        console.warn('[EvidenceTwin] py.stdin error suppressed (EPIPE prevented):', stdinErr?.message);
      });

      py.on('error', (procErr: any) => {
        clearTimeout(timeoutId);
        console.warn('[EvidenceTwin] OpenCV Python process error:', procErr?.message);
        safeSendJson(200, {
          status: 'PROCESSING_ERROR',
          gate: {
            passed: false,
            verdict: 'BLOCKED',
            status: 'PROCESSING_ERROR',
            reasons: [procErr?.message || 'OpenCV process error'],
            required_actions: ['Retry analysis.']
          }
        });
      });

      py.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      py.on('close', (code) => {
        clearTimeout(timeoutId);
        if (isHandled || res.headersSent || res.writableEnded) return;

        if (code !== 0 && !stdoutData.trim()) {
          console.warn('[EvidenceTwin] Python pipeline returned non-zero code:', code, stderrData);
          return safeSendJson(200, {
            status: 'PROCESSING_ERROR',
            gate: {
              passed: false,
              verdict: 'BLOCKED',
              status: 'PROCESSING_ERROR',
              reasons: [stderrData || `OpenCV process exited with code ${code}`],
              required_actions: ['Retry image analysis with a clear photographic frame.']
            }
          });
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          return safeSendJson(200, parsed);
        } catch (parseErr) {
          console.warn('[EvidenceTwin] Failed to parse Python pipeline JSON output:', parseErr, stdoutData);
          return safeSendJson(200, {
            status: 'PROCESSING_ERROR',
            gate: {
              passed: false,
              verdict: 'BLOCKED',
              status: 'PROCESSING_ERROR',
              reasons: ['Malformed vision engine output.'],
              required_actions: ['Retry analysis with a standard image format.']
            }
          });
        }
      });

      try {
        if (!py.killed && py.stdin.writable) {
          py.stdin.write(payload);
          py.stdin.end();
        }
      } catch (writeErr: any) {
        console.warn('[EvidenceTwin] Error writing payload to python process stdin:', writeErr?.message);
      }
    } catch (err: any) {
      console.error('[EvidenceTwin] Error executing CV pipeline:', err);
      safeSendJson(500, {
        status: 'PROCESSING_ERROR',
        error: err.message,
        gate: {
          passed: false,
          verdict: 'BLOCKED',
          status: 'PROCESSING_ERROR',
          reasons: [err.message],
          required_actions: ['Retry analysis.'],
        },
      });
    }
  });

  // Vite Dev Server middleware or Static Serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EvidenceTwin] Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EvidenceTwin server:', err);
  process.exit(1);
});
