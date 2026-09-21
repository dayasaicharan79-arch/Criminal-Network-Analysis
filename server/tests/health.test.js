import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { healthRouter } from '../src/routes/health.js';

describe('Health endpoint', () => {
  it('returns 200 with operational status', async () => {
    const app = express();
    app.use('/api', healthRouter);
    const server = http.createServer(app);

    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'operational');
      assert.equal(body.data.service, 'constellation-server');
      assert.ok(body.data.timestamp);
      assert.ok(body.data.uptime >= 0);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
