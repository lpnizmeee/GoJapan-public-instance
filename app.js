const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, ScanCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const fs = require('fs');
const path = require('path');

// Khởi tạo Express app
const app = express();

// Cấu hình view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
            key: { S: req.file.originalname },
            filename: { S: req.file.originalname },
            s3Uri: { S: `s3://${params.Bucket}/${params.Key}` },
            uploadTime: { S: uploadTime }
        };

        // Thêm item vào DynamoDB
        const dynamoParams = {
            TableName: 'S3MetadataTable',
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

// Route để hiển thị danh sách file từ DynamoDB
app.get('/', async (req, res) => {
    const params = {
        TableName: 'S3MetadataTable'
    };

    try {
        const data = await dynamoDBClient.send(new ScanCommand(params));

        // Tạo danh sách file từ dữ liệu DynamoDB
        const files = data.Items.map(item => ({
            s3Uri: item.s3Uri ? item.s3Uri.S : 'No URI',
            filename: item.filename ? item.filename.S : 'No filename',
            uploadTime: item.uploadTime ? item.uploadTime.S : 'No upload time'
        }));

        // Render HTML với danh sách file
        res.render('index', { files });
    } catch (err) {
        console.error('Error retrieving files from DynamoDB:', err);
        res.status(500).send('Error retrieving files from DynamoDB');
    }
});


app.get('/file/:key', async (req, res) => {

    try {
        // Tạo lệnh GetObject để lấy nội dung file từ S3
        const getObjectParams = {
            Bucket: 'cloud-internship-project3-s3', // Thay bằng tên bucket của bạn
        };

        const command = new GetObjectCommand(getObjectParams);
        const response = await s3Client.send(command);

        // Đọc nội dung file từ S3 response
        let fileContent = '';
        response.Body.setEncoding('utf-8');
        response.Body.on('data', chunk => {
            fileContent += chunk;
        });

        response.Body.on('end', () => {
            res.send(`<pre>${fileContent}</pre>`);
        });

    } catch (err) {
        console.error('Error retrieving file from S3:', err);
        res.status(500).send('Error retrieving file from S3');
    }
});


// Khởi chạy server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
