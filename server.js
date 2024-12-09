import express from 'express';
import routes from './routes/index';

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.app.use(express.json());
    this.setupRoutes();
  }

  setupRoutes() {
    // Load all routes
    this.app.use('/', routes);
  }

  start() {
    return this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

const server = new Server();
server.start();

export default server.app;
