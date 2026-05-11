# Image Upload API

Standalone ES modules image upload API using Node.js, Express, Multer, dotenv, and optional Cloudinary.

## Features

- `multipart/form-data` upload
- local image storage in `/uploads`
- allowed types: `jpg`, `jpeg`, `png`, `webp`
- max size: `5MB`
- unique filenames using timestamp + random string
- static file serving
- reusable Multer middleware
- proper error handling
- optional Cloudinary upload route

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill values as needed.

## Routes

### Local upload

`POST /api/upload`

Form-data:

- key: `image`
- type: `File`

Example response:

```json
{
  "success": true,
  "imageUrl": "/uploads/1746800000-abcd1234.png",
  "imageFullUrl": "http://localhost:5000/uploads/1746800000-abcd1234.png"
}
```

### Cloudinary upload

`POST /api/upload/cloudinary`

Requires Cloudinary env vars.

## Example fetch

```js
const formData = new FormData();
formData.append("image", fileInput.files[0]);

const response = await fetch("http://localhost:5000/api/upload", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log(data);
```

## Postman setup

- Method: `POST`
- URL: `http://localhost:5000/api/upload`
- Body: `form-data`
- Key: `image`
- Type: `File`
- Value: choose a `.jpg`, `.jpeg`, `.png`, or `.webp` image
