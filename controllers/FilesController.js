const { ObjectId } = require('mongodb');
const fs = require('fs');
const { v4 } = require('uuid');
const mime = require('mime-types');
const dbClient = require('../utils/db');
const { redisClient } = require('../utils/redis');

const rootFolder = process.env.FOLDER_PATH || '/tmp/files_manager';

export async function postUpload(req, res) {
  const token = req.headers['x-token'];
  const { name, type, data } = req.body;
  const [isPublic, parentId] = [req.body.isPublic || false, req.body.parentId || 0];
  const userId = await redisClient.get(`auth_${token}`);
  const collection = await dbClient.getClient('files');

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
  } else if (!name) {
    res.status(400).json({ error: 'Missing name' });
  } else if (!type || !['folder', 'file', 'image'].includes(type)) {
    res.status(400).json({ error: 'Missing type' });
  } else if (!data && type !== 'folder') {
    res.status(400).json({ error: 'Missing data' });
  } else if (parentId !== 0) {
    const file = await collection.findOne({ _id: ObjectId(parentId) });
    if (!file) {
      res.status(400).json({ error: 'Page not found' });
    } else if (file.type !== 'folder') {
      res.status(400).json({ error: 'Parent is not a folder' });
      return;
    }
  }
  if (type === 'folder') {
    const obj = await collection.insertOne({
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
    });

    const fName = obj.insertedId.toString();
    res.json({
      id: fName, userId, name, type, isPublic, parentId,
    });
    fs.mkdir(parentId === 0 ? `${rootFolder}/${fName}` : `${rootFolder}/${parentId}/${fName}`, () => {});
  } else {
    const fileDBName = v4();
    const localPath = parentId === 0 ? `${rootFolder}/${fileDBName}` : `${rootFolder}/${parentId}/${fileDBName}`;
    const obj = await collection.insertOne({
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
      localPath,
    });

    fs.writeFile(localPath, Buffer.from(data, 'base64').toString('utf-8'), () => {});
    res.status(201).json({
      id: obj.insertedId.toString(), userId, name, type, isPublic, parentId,
    });
  }
}

export async function getShow(req, res) {
  const token = req.headers['x-token'];
  const userId = await redisClient.get(`auth_${token}`);
  const collection = await dbClient.getClient('files');

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    const file = await collection.findOne({
      userId: ObjectId(userId),
      _id: ObjectId(req.params.id),
    });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(file);
    }
  }
}

export async function getIndex(req, res) {
  const token = req.headers['x-token'];
  const parentId = req.query.parentId ? ObjectId(req.query.parentId) : 0;
  const userId = ObjectId(await redisClient.get(`auth_${token}`));
  const collection = await dbClient.getClient('files');

  if (!userId.toString()) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    const files = await collection.aggregate([
      { $match: parentId !== 0 ? { userId, parentId } : { userId } },
      { $sort: { _id: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: '$parentId',
        },
      },
    ]).toArray();
    res.json(files);
  }
}

export async function putPublish(req, res) {
  const token = req.headers['x-token'];
  const { id } = req.params;
  const userId = await redisClient.get(`auth_${token}`);
  const collection = await dbClient.getClient('files');
  const fileFilter = { _id: ObjectId(id), userId: ObjectId(userId) };
  const file = await collection.findOne(fileFilter);

  if (!file) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  collection.updateOne(fileFilter, { $set: { isPublic: true } });
  res.status(200).json({
    id,
    userId,
    name: file.name,
    type: file.type,
    isPublic: true,
    parentId: file.parentId,
  });
}

export async function putUnpublish(req, res) {
  const token = req.headers['x-token'];
  const { id } = req.params;
  const userId = await redisClient.get(`auth_${token}`);
  const collection = await dbClient.getClient('files');
  const fileFilter = { _id: ObjectId(id), userId: ObjectId(userId) };
  const file = await collection.findOne(fileFilter);

  if (!file) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  collection.updateOne(fileFilter, { $set: { isPublic: false } });
  res.status(200).json({
    id,
    userId,
    name: file.name,
    type: file.type,
    isPublic: false,
    parentId: file.parentId,
  });
}

export async function getFile(req, res) {
  const token = req.headers['x-token'];
  const { id } = req.params;
  const userId = await redisClient.get(`auth_${token}`);
  const collection = await dbClient.getClient('files');
  const file = await collection.findOne({ _id: ObjectId(id) });
  if (!file || (file.isPublic === false && (!userId || file.userId !== ObjectId(userId)))) {
    res.status(404).json({ error: 'Not Found' });
    return;
  }
  if (file.type === 'folder') {
    res.status(400).json({ error: "A folder doesn't have content" });
  } else {
    if (!fs.existsSync(file.localPath)) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    const absoluteFilePath = fs.realpathSync(file.localPath);
    res.setHeader('Content-Type', mime.contentType(file.localPath) || 'text/plain; charset=utf-8');
    res.status(200).sendFile(absoluteFilePath);
  }
}
