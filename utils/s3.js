const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")

require('dotenv').config();

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})

const uploadFile = async (fileBuffer, fileName, mimetype) => {
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: fileName, // Ensure the Key parameter is set
        ContentType: mimetype
    };
    console.log(uploadParams.Key);

    try {
        const data = await s3Client.send(new PutObjectCommand(uploadParams)); // Use s3Client.send to send the PutObjectCommand
        console.log('File uploaded successfully:', data);
        //return data;
        return { Location: `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}` };
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw new Error('Error uploading file to S3');
    }
};



const getObjectSignedUrl = async (key) => {
    const params = {
      Bucket: bucketName,
      Key: key,
    };
  
    const command = new GetObjectCommand(params);
    const seconds = 60 * 60 * 24; // URL expires in 30 days
    const url = await getSignedUrl(s3Client, command, { expiresIn: seconds });
    return url;
  };

const deleteFile = (fileName) => {
    const deleteParams = {
        Bucket: bucketName,
        Key: fileName,
    }

    return s3Client.send(new DeleteObjectCommand(deleteParams));
}

module.exports = {
    deleteFile,
    uploadFile,
    getObjectSignedUrl
}