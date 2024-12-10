import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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

//   static async postUpload(req, res) {
//     try {
//         // 1. User Authentication
//         const token = req.headers['x-token'];
//         if (!token) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const userId = await redisClient.get(`auth_${token}`);
//         if (!userId) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });
//         if (!user) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         // 2. Request Validation
//         const { name, type, parentId = 0, isPublic = false, data } = req.body;
        
//         // Validate required fields in correct order
//         if (!name) {
//             return res.status(400).json({ error: 'Missing name' });
//         }

//         const acceptedTypes = ['folder', 'file', 'image'];
//         if (!type || !acceptedTypes.includes(type)) {
//             return res.status(400).json({ error: 'Missing type' });
//         }

//         if (!data && type !== 'folder') {
//             return res.status(400).json({ error: 'Missing data' });
//         }

//         // 3. Parent Folder Validation
//         if (parentId !== 0) {
//             const parentFile = await dbClient.db.collection('files')
//                 .findOne({ 
//                     _id: new ObjectId(parentId),
//                     userId: new ObjectId(userId)  // Check user owns the parent
//                 });
//             if (!parentFile) {
//                 return res.status(400).json({ error: 'Parent not found' });
//             }
//             if (parentFile.type !== 'folder') {
//                 return res.status(400).json({ error: 'Parent is not a folder' });
//             }
//         }

//         // 4. File Processing
//         const fileDocument = {
//             userId: new ObjectId(userId),
//             name,
//             type,
//             isPublic,
//             parentId: parentId === 0 ? 0 : new ObjectId(parentId),
//         };

//         // Handle folder creation
//         if (type === 'folder') {
//             const result = await dbClient.db.collection('files').insertOne(fileDocument);
//             fileDocument._id = result.insertedId;
//             return res.status(201).json(fileDocument);
//         }

//         // 5. File Storage
//         const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
//         if (!fs.existsSync(folderPath)) {
//             fs.mkdirSync(folderPath, { recursive: true });
//         }

//         const filename = uuidv4();
//         const localPath = path.join(folderPath, filename);
//         const fileContent = Buffer.from(data, 'base64');
//         fs.writeFileSync(localPath, fileContent);

//         // Add localPath to document and save to DB
//         fileDocument.localPath = localPath;
//         const result = await dbClient.db.collection('files').insertOne(fileDocument);
//         fileDocument._id = result.insertedId;

//         // Format response
//         const response = {
//             id: result.insertedId,  // Change _id to id
//             userId: fileDocument.userId,
//             name: fileDocument.name,
//             type: fileDocument.type,
//             isPublic: fileDocument.isPublic,
//             parentId: fileDocument.parentId
//         };

//         // Add to image processing queue if needed
//         if (type === 'image') {
//             fileQueue.add({
//                 userId: fileDocument.userId,
//                 fileId: result.insertedId,
//             });
//         }

//         return res.status(201).json(response);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
//   }

static async postUpload(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const { name } = request.body;
    const { type } = request.body;
    const { parentId } = request.body;
    const isPublic = request.body.isPublic || false;
    const { data } = request.body;
    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    if (!type) {
      return response.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return response.status(400).json({ error: 'Missing data' });
    }

    const files = dbClient.db.collection('files');
    if (parentId) {
      const idObject = new ObjectID(parentId);
      const file = await files.findOne({ _id: idObject, userId: user._id });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          parentId: parentId || 0,
          isPublic,
        },
      ).then((result) => response.status(201).json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
      })).catch((error) => {
        console.log(error);
      });
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = `${filePath}/${uuidv4()}`;
      const buff = Buffer.from(data, 'base64');
      // const storeThis = buff.toString('utf-8');
      try {
        try {
          await fs.mkdir(filePath);
        } catch (error) {
          // pass. Error raised when file already exists
        }
        await fs.writeFile(fileName, buff, 'utf-8');
      } catch (error) {
        console.log(error);
      }
      files.insertOne(
        {
          userId: user._id,
          name,
          type,
          isPublic,
          parentId: parentId || 0,
          localPath: fileName,
        },
      ).then((result) => {
        response.status(201).json(
          {
            id: result.insertedId,
            userId: user._id,
            name,
            type,
            isPublic,
            parentId: parentId || 0,
          },
        );
        if (type === 'image') {
          fileQueue.add(
            {
              userId: user._id,
              fileId: result.insertedId,
            },
          );
        }
      }).catch((error) => console.log(error));
    }
    return null;
  }
}

export default FilesController;
