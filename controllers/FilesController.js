import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import mime from 'mime-types';
import fileQueue from '../worker';

class FilesController {
  static async postNew(req, res) {
    // User Authentication
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Request Validation
    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Add file size validation
    if (type !== 'folder' && data) {
      const fileSize = Buffer.from(data, 'base64').length;
      const maxSize = 1024 * 1024 * 5; // 5MB limit
      if (fileSize > maxSize) {
        return res.status(400).json({ error: 'File too large' });
      }
    }

    // Add filename sanitization
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_\.]/g, '_');

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Parent Folder Validation
    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files')
        .findOne({ _id: new ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // File Processing
    const fileDocument = {
      userId: new ObjectId(userId),
      name: sanitizedName,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
      createdAt: new Date(),
    };

    // Handle folder creation
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      fileDocument._id = result.insertedId;
      return res.status(201).json(fileDocument);
    }

    // File Storage
    // Get storage path from env or use default
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Generate unique filename and save path
    const filename = uuidv4();
    const localPath = path.join(folderPath, filename);

    // Save file to disk
    const fileContent = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, fileContent);

    // Add localPath to document and save to DB
    fileDocument.localPath = localPath;
    const result = await dbClient.db.collection('files').insertOne(fileDocument);
    fileDocument._id = result.insertedId;

    // Return new file document
    return res.status(201).json(fileDocument);
  }

  static async postUpload(req, res) {
    try {
        // 1. User Authentication
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 2. Request Validation
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        
        // Validate required fields in correct order
        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }

        const acceptedTypes = ['folder', 'file', 'image'];
        if (!type || !acceptedTypes.includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }

        if (!data && type !== 'folder') {
            return res.status(400).json({ error: 'Missing data' });
        }

        // 3. Parent Folder Validation
        if (parentId !== 0) {
            const parentFile = await dbClient.db.collection('files')
                .findOne({ 
                    _id: new ObjectId(parentId),
                    userId: new ObjectId(userId)  // Check user owns the parent
                });
            if (!parentFile) {
                return res.status(400).json({ error: 'Parent not found' });
            }
            if (parentFile.type !== 'folder') {
                return res.status(400).json({ error: 'Parent is not a folder' });
            }
        }

        // 4. File Processing
        const fileDocument = {
            userId: new ObjectId(userId),
            name,
            type,
            isPublic,
            parentId: parentId === 0 ? 0 : new ObjectId(parentId),
        };

        // Handle folder creation
        if (type === 'folder') {
            const result = await dbClient.db.collection('files').insertOne(fileDocument);
            fileDocument._id = result.insertedId;
            return res.status(201).json(fileDocument);
        }

        // 5. File Storage
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const filename = uuidv4();
        const localPath = path.join(folderPath, filename);
        const fileContent = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, fileContent);

        // Add localPath to document and save to DB
        fileDocument.localPath = localPath;
        const result = await dbClient.db.collection('files').insertOne(fileDocument);
        fileDocument._id = result.insertedId;

        // Format response
        const response = {
            id: result.insertedId,
            userId: fileDocument.userId,
            name: fileDocument.name,
            type: fileDocument.type,
            isPublic: fileDocument.isPublic,
            parentId: fileDocument.parentId
        };

        // Add to image processing queue if needed
        if (type === 'image') {
            await fileQueue.add({
                userId: fileDocument.userId.toString(),
                fileId: result.insertedId.toString(),
            });
        }

        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getShow(req, res) {
    try {
      // 1. User Authentication
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 2. Find File
      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId),
        userId: new ObjectId(userId)
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIndex(req, res) {
    try {
      // 1. User Authentication
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 2. Parse query parameters
      const parentId = req.query.parentId || '0';
      const page = parseInt(req.query.page) || 0;
      const pageSize = 20;

      // 3. Build query
      const query = {
        userId: new ObjectId(userId)
      };

      // Add parentId to query if it's not '0'
      if (parentId !== '0') {
        query.parentId = new ObjectId(parentId);
      } else {
        query.parentId = 0;
      }

      // 4. Execute paginated query using aggregation
      const files = await dbClient.db.collection('files')
        .aggregate([
          { $match: query },
          { $skip: page * pageSize },
          { $limit: pageSize }
        ]).toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async putPublish(req, res) {
    try {
      // 1. User Authentication
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 2. Find and Update File
      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(fileId), userId: new ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' }
      );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file.value);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      // 1. User Authentication
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // 2. Find and Update File
      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(fileId), userId: new ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' }
      );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file.value);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const size = req.query.size ? parseInt(req.query.size) : null;
      
      // 1. Find the file document
      const file = await dbClient.db.collection('files').findOne({
        _id: new ObjectId(fileId)
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // 2. Check file permissions
      if (!file.isPublic) {
        const token = req.headers['x-token'];
        if (!token) {
          return res.status(404).json({ error: 'Not found' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId || file.userId.toString() !== userId) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      // 3. Check if it's a folder
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // 4. Determine the correct file path based on size
      let filePath = file.localPath;
      if (size && [100, 250, 500].includes(size)) {
        filePath = `${file.localPath}_${size}`;
      }

      // 5. Check if file exists locally
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // 6. Get MIME type and serve file
      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      const fileContent = fs.readFileSync(filePath);
      res.setHeader('Content-Type', mimeType);
      return res.send(fileContent);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
