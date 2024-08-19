const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

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

// Tạo route để upload file
app.post('/upload', upload.single('file'), (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);

    const params = {
        Bucket: 'cloud-internship-project3-s3',
        Key: req.file.originalname,
        Body: fileContent,
        ContentType: req.file.mimetype
    };

    // Tạo lệnh PutObject và upload file 
    const command = new PutObjectCommand(params);

    s3Client.send(command)
        .then(data => {
            // Xóa file tạm sau khi upload lên S3
            fs.unlinkSync(req.file.path);

            res.send(`File uploaded successfully: https://${params.Bucket}.s3.amazonaws.com/${params.Key}`);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error uploading file');
        });
});

// Khởi chạy server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
