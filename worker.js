import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import dbClient from './utils/db';

// File Queue
const fileQueue = new Bull('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

// User Queue
const userQueue = new Bull('userQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

// File processing
const generateThumbnail = async (path, width) => {
  try {
    const thumbnail = await imageThumbnail(path, { width });
    const thumbnailPath = `${path}_${width}`;
    await fs.promises.writeFile(thumbnailPath, thumbnail);
  } catch (error) {
    console.error(`Error generating ${width} thumbnail:`, error);
    throw error;
  }
};

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId)
  });

  if (!file) throw new Error('File not found');

  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map(size => generateThumbnail(file.localPath, size));
  
  await Promise.all(thumbnailPromises);
});

// User welcome email processing
userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const user = await dbClient.db.collection('users').findOne({
    _id: new ObjectId(userId)
  });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});

export default {
  fileQueue,
  userQueue,
};
