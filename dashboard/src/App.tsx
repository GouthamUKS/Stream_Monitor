import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

interface Metric {
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
  bitrate: number;
  bufferLength: number;
  latency: number;
  variant: string;
  errors: number;
  droppedFrames: number;
  connected: boolean;
}

const Dash: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [state, setState] = useState<StreamState>({
    bitrate: 0,
    bufferLength: 0,
    latency: 0,
    variant: '720p',
    errors: 0,
    droppedFrames: 0,
    connected: false,
  });

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      setState(prev => ({ ...prev, connected: true }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'metrics') {
        const metric = message.data;
        setMetrics(prev => {
          const updated = [...prev, metric];
          if (updated.length > 60) updated.shift();
          return updated;
        });
        
        setState(prev => ({
          ...prev,
          bitrate: Math.round(metric.bitrate),
          bufferLength: metric.bufferLength.toFixed(1),
          latency: Math.round(metric.downloadLatency),
          variant: metric.variant,
          errors: metric.errors,
          droppedFrames: metric.droppedFrames,
        }));
      } else if (message.type === 'init') {
        setMetrics(message.metrics);
      }
    };
    
    ws.onclose = () => {
      setState(prev => ({ ...prev, connected: false }));
    };
    
    return () => ws.close();
  }, []);

  const getStatusColor = (ok: boolean) => ok ? '#10b981' : '#ef4444';
  const getBufferStatus = (buffer: number) => buffer < 2 ? 'critical' : buffer < 5 ? 'warning' : 'ok';

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Stream Health Monitor</h1>
      
      {/* Status Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${getStatusColor(state.bitrate > 2000)}` }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>BITRATE</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{state.bitrate} kbps</div>
        </div>
        
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${getStatusColor(state.bufferLength > 5)}` }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>BUFFER</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{state.bufferLength}s</div>
        </div>
        
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${getStatusColor(state.latency < 200)}` }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>LATENCY</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{state.latency}ms</div>
        </div>
        
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${getStatusColor(state.errors === 0)}` }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>ERRORS</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{state.errors}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
          <h3>Bitrate Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid stroke="#333" />
              <XAxis dataKey="timestamp" hide />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="bitrate"
                stroke="#ff6b35"
                isAnimationActive={true}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
          <h3>Buffer Length</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics}>
              <CartesianGrid stroke="#333" />
              <XAxis dataKey="timestamp" hide />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="bufferLength"
                fill="#ff6b35"
                stroke="#ff6b35"
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fault Injection */}
      <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
        <h3>Fault Injection (for demo)</h3>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button onClick={() => fetch('http://localhost:3001/fault/segment-404', {method: 'POST'})} style={{ padding: '8px 16px', cursor: 'pointer' }}>🔴 Segment 404</button>
          <button onClick={() => fetch('http://localhost:3001/fault/slow-segment', {method: 'POST'})} style={{ padding: '8px 16px', cursor: 'pointer' }}>🐢 Slow Segment</button>
          <button onClick={() => fetch('http://localhost:3001/fault/bitrate-spike', {method: 'POST'})} style={{ padding: '8px 16px', cursor: 'pointer' }}>📈 Bitrate Spike</button>
          <button onClick={() => fetch('http://localhost:3001/fault/clear', {method: 'POST'})} style={{ padding: '8px 16px', cursor: 'pointer' }}>✓ Clear</button>
        </div>
      </div>
    </div>
  );
};

export default Dash;
