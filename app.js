const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Thêm UUID để tạo key duy nhất

// Khởi tạo Express app
const app = express();

// Thiết lập thư mục tĩnh
app.use(express.static('public'));

// Cấu hình Multer (chỉ để lưu tạm thời trước khi upload lên S3)
const upload = multer({ dest: 'src/uploads/' });

// Khởi tạo S3 client
const s3Client = new S3Client({
    region: 'ap-northeast-1',
});

// Khởi tạo DynamoDB client
const dynamoDBClient = new DynamoDBClient({
    region: 'ap-northeast-1',
});

// Tạo route để upload file
app.post('/upload', upload.single('file'), async (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);

    const params = {
        Bucket: 'cloud-internship-project3-s3',
        Key: req.file.originalname,
        Body: fileContent,
        ContentType: req.file.mimetype
    };

    // Tạo lệnh PutObject và upload file 
    const command = new PutObjectCommand(params);

    try {
        await s3Client.send(command);

        // Tạo thông tin để lưu vào DynamoDB
        const uploadTime = new Date().toISOString();
        const item = {
            key: { S: req.file.originalname }, // Tạo key duy nhất cho DynamoDB
            filename: { S: req.file.originalname },
            s3Uri: { S: `s3://${params.Bucket}/${params.Key}` },
            uploadTime: { S: uploadTime }
        };

        // Thêm item vào DynamoDB
        const dynamoParams = {
            TableName: 'S3MetadataTable', //
            Item: item
        };

        const dynamoCommand = new PutItemCommand(dynamoParams);
        await dynamoDBClient.send(dynamoCommand);

        // Xóa file tạm sau khi upload lên S3
        fs.unlinkSync(req.file.path);

        res.send(`File uploaded successfully: ${item.s3Uri.S}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading file');
    }
});

// Khởi chạy server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
