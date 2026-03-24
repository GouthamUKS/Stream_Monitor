# Stream Health Monitor

A NOC (Network Operations Center) style live HLS stream monitoring dashboard. Real-time visualization of stream metrics (bitrate, buffer, latency, errors) with WebSocket-powered updates and fault injection for testing.

Built as a demonstration of streaming operations tooling used during live sports and event broadcasts at major streaming platforms.

## Architecture

```
        Dashboard (React)
            |
            | WebSocket
            v
      Stream Monitor Server (Node.js + Express)
            |
            +---> Metrics Generation
            +---> Fault Injection API
```

## Features

- **Real-time Metrics Dashboard**: Displays live stream health KPIs
  - Current bitrate (kbps)
  - Buffer length (seconds)
  - Segment download latency (ms)
  - Current playing variant (quality)
  - Frame drops and errors

- **Historical Charts**: Last 60 seconds of metrics
  - Bitrate over time (line chart)
  - Buffer length (area chart)
  - Segment latency tracking
  - Error rate monitoring

- **Fault Injection**: Simulate common streaming failures
  - Segment 404 errors
  - Slow segment downloads (5+ seconds)
  - Bitrate spikes
  - Observe dashboard reaction (buffer drops, quality switches)

- **WebSocket Streaming**: Update interval 1/second, real-time responsiveness

## Use Case

This tool simulates the monitoring dashboards used by NOCs during:
- Live sports broadcasts (ESPN, Peacock, Fubo)
- Entertainment events (Oscar ceremony, award shows)
- Breaking news coverage (24/7 news networks)
- Product launches (Apple, Nike streaming events)

Operations teams use these dashboards to:
1. Monitor multiple stream regions in parallel
2. Detect issues in real-time (buffer stalls, quality drops)
3. Trigger automated failover or human intervention
4. Analyze post-incident to improve reliability

## Project Structure

```
stream-health-monitor/
├── server/
│   ├── src/
│   │   └── index.ts              # Express + WebSocket server
│   ├── package.json
│   ├── tsconfig.json
│   └── node_modules/
│
├── dashboard/
│   ├── src/
│   │   ├── App.tsx               # Main dashboard component
│   │   ├── components/
│   │   │   ├── StreamPlayer.tsx  # hls.js player
│   │   │   ├── BitrateChart.tsx
│   │   │   ├── BufferChart.tsx
│   │   │   ├── StatusPanel.tsx
│   │   │   └── FaultControls.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useMetrics.ts
│   │   └── types/
│   │       └── metrics.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd server
npm install
```

### Frontend Setup

```bash
cd dashboard
npm install
```

## Running Locally

### Terminal 1: Start Backend Server

```bash
cd server
npm run dev
# Running on localhost:3001
```

### Terminal 2: Start Frontend Dashboard

```bash
cd dashboard
npm run dev
# Running on localhost:5173
# Open http://localhost:5173
```

The dashboard will automatically connect to the server via WebSocket. You should see live metrics updating every second.

## Using Fault Injection

Click the buttons in the dashboard to simulate failures:

1. **🔴 Segment 404**: Simulates a HTTP 404 error on next segment
   - Watch: Buffer drops sharply, errors increment, status turns red
   - Reality: Network issues, CDN serving wrong content, origin offline

2. **🐢 Slow Segment**: Simulates a 5+ second segment download
   - Watch: Latency spikes, buffer starts draining
   - Reality: Network congestion, CDN overload, international distribution delays

3. **📈 Bitrate Spike**: Temporarily increases bitrate requirement
   - Watch: May trigger ABR downswitch if buffer depletes
   - Reality: Encoder misconfiguration, quality degradation

4. **✓ Clear**: Removes all active faults
   - Watch: Metrics return to normal, stream recovers

## API Endpoints

### WebSocket

`ws://localhost:3001`

Receives JSON messages every second:

```json
{
  "type": "metrics",
  "data": {
    "timestamp": 1711270200000,
    "bitrate": 2487.3,
    "resolution": "1280x720",
    "bufferLength": 11.2,
    "downloadLatency": 52,
    "currentBitrate": 2500,
    "variant": "720p",
    "droppedFrames": 0,
    "errors": 0
  },
  "allMetrics": [...]  // Last 60 seconds of history
}
```

### REST Endpoints

**Fault Injection**

```
POST /fault/segment-404
POST /fault/slow-segment
POST /fault/bitrate-spike
POST /fault/clear

Response: { status: "injected|cleared", fault: "..." }
```

**Health Check**

```
GET /health
Response: { status: "ok", uptime: ... }
```

## Architecture Details

### Server (Node.js + TypeScript)

- **Express**: HTTP server for fault injection API
- **WebSocket (ws)**: Persistent connection to all connected dashboards
- **Metrics Generation**: Simulates real stream metrics with Gaussian noise
- **Fault Injection**: In-memory state machine for triggered failures
- **Broadcast**: Every second, sends new metric point to all connected clients

### Dashboard (React + TypeScript)

- **useWebSocket Hook**: Manages WebSocket connection + reconnection
- **useMetrics Hook**: Tracks rolling window of last 60 metrics
- **Status Panel**: Color-coded status indicators (green/yellow/red)
- **Recharts**: Real-time animated line/area charts
- **Fault Controls**: REST calls to trigger simulated failures

### Metrics Calculation

Real-world metrics are simulated based on:

- **Bitrate**: Normal distribution around 2500 kbps with small variance
- **Buffer**: Simulates typical 8-15 seconds, drains during faults
- **Latency**: Typical 40-70ms (CDN latency), spikes to 5000ms on "slow segment" fault
- **Errors**: Increment during 404 faults, reset on clear
- **Drops**: Real metric (would come from hls.js `droppedFrames` event in production)

## Production Considerations

In a real NOC dashboard:

1. **Multiple Streams**: Grid of dashboards, one per region/variant
2. **Alerting**: Thresholds that trigger notifications
3. **Historical Data**: Database storage for post-incident analysis
4. **Authentication**: OAuth/SAML for team access control
5. **Metrics Sources**: Real data from CDN logs, player events, probe tools
6. **Incident Correlation**: Link metrics to deployment/config changes

## Author

Built by Goutham Soratoor, with 4 years of broadcast and streaming pipeline engineering.
This tool simulates the monitoring dashboards deployed at:
- Major streaming platforms (Netflix, Peacock, Fubo)
- Broadcast networks (ESPN, NBCSN)
- Live event platforms (Ticketmaster, SeatGeek)

GitHub: https://github.com/GouthamUKS
Vercel: https://vercel.com/gouthamukss-projects

## Code Quality

- TypeScript strict mode for both server and client
- Type-safe WebSocket messaging
- Custom React hooks for separation of concerns
- Error handling on connection failures
- Cleanup on component unmount

## Deployment

### Frontend Only (Easiest)

```bash
cd dashboard
npm run build
# Deploy dist/ folder to Vercel, Netlify, or static host
```

### Full Stack (Backend + Frontend)

```bash
# Backend on AWS Lambda or Heroku
# Frontend on Vercel

# Or locally for demo: run both terminals
```

## Demo Video Script

1. Start both server and dashboard
2. Show dashboard with stable metrics (2500 kbps, 10s buffer)
3. Click "Segment 404"
   - Point: "Notice the error counter increments and buffer drops"
4. Click "Clear"
   - Point: "Metrics recover quickly - the player has ABR logic"
5. Click "Slow Segment"
   - Point: "Watching 5-second download spike, buffer drains in real-time"
6. Wait for auto-clear
   - Point: "Stream recovers. This is what ops teams monitor 24/7"

## License

MIT License
