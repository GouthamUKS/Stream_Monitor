import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// CORS middleware
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Metrics state (in-memory)
interface MetricsSnapshot {
  timestamp: number;
  bitrate: number;
  resolution: string;
  bufferLength: number;
  downloadLatency: number;
  currentBitrate: number;
  variant: string;
  droppedFrames: number;
  errors: number;
}

interface StreamState {
  metrics: MetricsSnapshot[];
  faults: Set<string>;
  lastUpdate: number;
}

const streamState: StreamState = {
  metrics: [],
  faults: new Set(),
  lastUpdate: 0,
};

// Initialize with sample data
function initializeMetrics() {
  const now = Date.now();
  streamState.metrics = [];
  
  for (let i = 0; i < 60; i++) {
    streamState.metrics.push({
      timestamp: now - (60 - i) * 1000,
      bitrate: 2500 + Math.random() * 500,
      resolution: '1280x720',
      bufferLength: 10 + Math.random() * 5,
      downloadLatency: 45 + Math.random() * 20,
      currentBitrate: 2500,
      variant: '720p',
      droppedFrames: 0,
      errors: 0,
    });
  }
}

initializeMetrics();

// Broadcast metrics to all connected clients
function broadcastMetrics() {
  const now = Date.now();
  
  // Generate new metric point
  const metric: MetricsSnapshot = {
    timestamp: now,
    bitrate: 2500 + (Math.random() - 0.5) * 200,
    resolution: '1280x720',
    bufferLength: 10 + (Math.random() - 0.5) * 3,
    downloadLatency: 45 + (Math.random() - 0.5) * 20,
    currentBitrate: 2500,
    variant: '720p',
    droppedFrames: 0,
    errors: 0,
  };
  
  // Apply faults if any
  if (streamState.faults.has('segment-404')) {
    metric.errors++;
    metric.bufferLength = 2;
    streamState.faults.delete('segment-404');
  }
  
  if (streamState.faults.has('slow-segment')) {
    metric.downloadLatency += 4000;
  }
  
  if (streamState.faults.has('bitrate-spike')) {
    metric.bitrate *= 1.5;
  }
  
  streamState.metrics.push(metric);
  if (streamState.metrics.length > 60) {
    streamState.metrics.shift();
  }
  
  streamState.lastUpdate = now;
  
  // Broadcast to all connected clients
  const data = JSON.stringify({
    type: 'metrics',
    data: metric,
    allMetrics: streamState.metrics,
  });
  
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === 1) {  // WebSocket.OPEN = 1
      client.send(data);
    }
  });
}

// WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  
  // Send initial metrics
  ws.send(JSON.stringify({
    type: 'init',
    metrics: streamState.metrics,
  }));
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
  
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

// Fault injection endpoints
app.post('/fault/segment-404', (_req: Request, res: Response) => {
  streamState.faults.add('segment-404');
  res.json({ status: 'injected', fault: 'segment-404' });
});

app.post('/fault/slow-segment', (_req: Request, res: Response) => {
  streamState.faults.add('slow-segment');
  setTimeout(() => {
    streamState.faults.delete('slow-segment');
  }, 5000);
  res.json({ status: 'injected', fault: 'slow-segment' });
});

app.post('/fault/bitrate-spike', (_req: Request, res: Response) => {
  streamState.faults.add('bitrate-spike');
  setTimeout(() => {
    streamState.faults.delete('bitrate-spike');
  }, 3000);
  res.json({ status: 'injected', fault: 'bitrate-spike' });
});

app.post('/fault/clear', (_req: Request, res: Response) => {
  streamState.faults.clear();
  res.json({ status: 'cleared' });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Start metrics broadcast
setInterval(broadcastMetrics, 1000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Stream Health Monitor server running on localhost:${PORT}`);
  console.log(`Fault injection endpoints:`);
  console.log(`  POST /fault/segment-404`);
  console.log(`  POST /fault/slow-segment`);
  console.log(`  POST /fault/bitrate-spike`);
  console.log(`  POST /fault/clear`);
});
