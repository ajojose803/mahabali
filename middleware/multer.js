const multer = require('multer');
const storage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    fileSize: 1024 * 1024 * 5,
});




//routing
app.post('/upload', upload.single('file'), async (req, res) => {
    // File upload handling and S3 upload logic goes here
});

const AWS = require('aws-sdk');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
  
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype
    };
  
    try {
      await s3.upload(params).promise();
      res.status(200).send('File uploaded to S3 successfully!');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error uploading file to S3');
    }
  });