const sha1 = require('sha1');
const dbClient = require('../utils/db');

module.exports = async function createUser(req, res) {
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
};
