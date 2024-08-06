const { v4 } = require('uuid');
const sha1 = require('sha1');
const dbClient = require('../utils/db');
const { redisClient } = require('../utils/redis');

export async function getConnect(req, res) {
  const { authorization } = req.headers;
  const details = atob(authorization.split(' ')[1]).split(':');
  const email = details[0]; const
    password = details[1];
  const token = v4(); // uuid version 4
  const collection = await dbClient.getClient('users');
  const user = await collection.findOne({ email, password: sha1(password) });

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    redisClient.set(`auth_${token.toString()}`, 24 * 3600, user._id.toString());
    res.json({ token });
  }
}

export async function getDisconnect(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(token);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    await redisClient.del(`auth_${token}`);
    res.send();
  }
}
