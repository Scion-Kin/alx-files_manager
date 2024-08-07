import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

const sha1 = require('sha1');
const dbClient = require('../utils/db');

export async function getConnect(req, res) {
  const auth = req.headers.authorization.split(' ')[1];
  const [email, password] = Buffer.from(auth, 'base64').toString('utf-8').split(':');
  const token = uuidv4();
  const collection = await dbClient.getClient('users');
  const user = await collection.findOne({ email, password: sha1(password) });

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
    res.status(200).json({ token });
  }
}

export async function getDisconnect(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}
