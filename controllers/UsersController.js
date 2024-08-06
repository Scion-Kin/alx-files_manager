const sha1 = require('sha1');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const { redisClient } = require('../utils/redis');

export async function createUser(req, res) {
  const email = req.body ? req.body.email : null;
  const password = req.body ? req.body.password : null;
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Missing password' });
    return;
  }
  const collection = await dbClient.getClient('users');
  const user = await collection.findOne({ email });
  if (user) {
    res.status(400).json({ error: 'Already exist' });
    return;
  }

  const created = await collection.insertOne({ email, password: sha1(password) });
  const userId = created.insertedId.toString();

  res.status(201).json({ email, id: userId });
}

export async function getMe(req, res) {
  const token = req.headers['x-token'];
  const id = await redisClient.get(`auth_${token}`);
  if (!id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const collection = await dbClient.getClient('users');
  const user = await collection.findOne({ _id: new ObjectId(id) });
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    res.json({ id: user._id, email: user.email });
  }
}
