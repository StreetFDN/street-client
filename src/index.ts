import app from './app';
import { config } from './config';

const port = config.port;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks/github`);
});
