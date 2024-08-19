const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// Khởi tạo Express app
const app = express();

// Cấu hình Multer (chỉ để lưu tạm thời trước khi upload lên S3)
const upload = multer({ dest: 'src/uploads/' });

// Khởi tạo S3 service object
const s3 = new AWS.S3();

// Tạo route để upload file
app.post('/upload', upload.single('file'), (req, res) => {
    const fileContent = fs.readFileSync(req.file.path);

    const params = {
        Bucket: 'cloud-internship-project3-s3', // Tên bucket
        Key: req.file.originalname, // Tên file
        Body: fileContent,
        ContentType: req.file.mimetype
    };

    // Upload file lên S3
    s3.upload(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error uploading file');
        }

        // Xóa file tạm sau khi upload lên S3
        fs.unlinkSync(req.file.path);

        res.send(`File uploaded successfully: ${data.Location}`);
    });
});

// Khởi chạy server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
