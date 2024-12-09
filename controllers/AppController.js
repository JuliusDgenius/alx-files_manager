import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * GET /status
   * Returns the status of Redis and DB connections
   */
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    return res.status(200).json(status);
  }

  /**
   * GET /stats
   * Returns the count of users and files in DB
   */
  static async getStats(req, res) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    return res.status(200).json(stats);
  }
}

export default AppController;
