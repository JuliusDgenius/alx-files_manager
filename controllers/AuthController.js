import dbClient from '../utils/db';
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    // Get Basic Auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode Base64 credentials
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
    const [email, password] = credentials.split(':');
    
    // Find user and compare SHA1 password
    const user = await dbClient.db.collection('users').findOne({ 
      email, 
      password: sha1(password) 
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate and store token
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // Get token from header
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if token exists in Redis
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete token and return success
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
