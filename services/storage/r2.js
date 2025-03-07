const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../../config');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

// Add debugging log for R2 configuration
console.log('R2 Configuration:', {
  BUCKET: process.env.R2_BUCKET_NAME,
  ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '[SET]' : '[MISSING]',
  SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '[SET]' : '[MISSING]',
  PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN
});

let r2Client = null;

/**
 * Initialize the R2 client with credentials from environment
 * @returns {S3Client} - Configured R2 client
 */
function getR2Client() {
  if (r2Client) return r2Client;
  
  console.log('Initializing R2 client...');
  
  try {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    
    console.log('R2 client initialized successfully');
    return r2Client;
  } catch (error) {
    console.error('Error initializing R2 client:', error);
    throw error;
  }
}

/**
 * Upload a file to R2 storage
 * @param {string} filePath - Path to local file
 * @param {string} key - Storage key (path in bucket)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{key: string, url: string}>} - Storage info
 */
async function uploadFile(filePath, key, contentType) {
  try {
    const client = getR2Client();
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    };
    
    await client.send(new PutObjectCommand(params));
    
    // Create URL for accessing the file
    const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    
    return {
      key,
      url: publicUrl
    };
  } catch (error) {
    console.error(`Error uploading file to R2: ${error.message}`);
    throw error;
  }
}

/**
 * Upload a buffer to R2 storage
 * @param {Buffer} buffer - File content as buffer
 * @param {string} key - Storage key (path in bucket)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{key: string, url: string}>} - Storage info
 */
async function uploadBuffer(buffer, key, contentType) {
  try {
    const client = getR2Client();
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };
    
    await client.send(new PutObjectCommand(params));
    
    // Create URL for accessing the file
    const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`;
    
    return {
      key,
      url: publicUrl
    };
  } catch (error) {
    console.error(`Error uploading buffer to R2: ${error.message}`);
    throw error;
  }
}

/**
 * Download a file from R2 storage
 * @param {string} key - Storage key (path in bucket)
 * @param {string} outputPath - Path to save the file
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadFile(key, outputPath) {
  try {
    const client = getR2Client();
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };
    
    const { Body } = await client.send(new GetObjectCommand(params));
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Write the file
    const writeStream = fs.createWriteStream(outputPath);
    await pipeline(Body, writeStream);
    
    return outputPath;
  } catch (error) {
    console.error(`Error downloading file from R2: ${error.message}`);
    throw error;
  }
}

/**
 * Stream a file from R2 to response
 * @param {string} key - Storage key (path in bucket)
 * @param {object} res - Express response object
 * @param {string} contentType - Content type header
 * @param {string} filename - Optional filename for download
 * @returns {Promise<void>}
 */
async function streamFileToResponse(key, res, contentType, filename = null) {
  try {
    const client = getR2Client();
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };
    
    const { Body, ContentLength } = await client.send(new GetObjectCommand(params));
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    if (ContentLength) {
      res.setHeader('Content-Length', ContentLength);
    }
    
    if (filename) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Stream directly to response
    await pipeline(Body, res);
  } catch (error) {
    console.error(`Error streaming file from R2: ${error.message}`);
    res.status(500).json({ error: 'Error streaming file from storage' });
  }
}

/**
 * Generate a presigned URL for temporary access
 * @param {string} key - Storage key (path in bucket)
 * @param {number} expiresIn - Expiration time in seconds (default 3600 - 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const client = getR2Client();
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };
    
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(client, command, { expiresIn });
    
    return url;
  } catch (error) {
    console.error(`Error generating presigned URL: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a file from R2 storage
 * @param {string} key - Storage key (path in bucket)
 * @returns {Promise<boolean>} - Success indicator
 */
async function deleteFile(key) {
  try {
    const client = getR2Client();
    
    const params = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };
    
    await client.send(new DeleteObjectCommand(params));
    return true;
  } catch (error) {
    console.error(`Error deleting file from R2: ${error.message}`);
    throw error;
  }
}

module.exports = {
  uploadFile,
  uploadBuffer,
  downloadFile,
  streamFileToResponse,
  getPresignedUrl,
  deleteFile
};
