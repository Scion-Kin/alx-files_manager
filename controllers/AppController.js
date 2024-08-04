import dbClient from '../utils/db';

const { redisClient } = require('../utils/redis');

export async function getStats(req, res) {
  res.json({ users: await dbClient.nbUsers(), files: await dbClient.nbFiles() });
}

export function getStatus(req, res) {
  res.json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
}
