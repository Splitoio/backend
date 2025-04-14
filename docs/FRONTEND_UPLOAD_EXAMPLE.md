## React File Upload Example

Here's a complete example of how to implement file upload in your React frontend using the presigned URLs:

```jsx
import { useState } from "react";
import axios from "axios";

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError("");

      // Step 1: Get a presigned upload URL from your backend
      const response = await axios.post(
        "/api/files/upload-url",
        {
          fileType: file.type,
          fileName: file.name,
          folder: "expenses",
        },
        {
          headers: {
            "Content-Type": "application/json",
            // Include your authentication token if needed
            // 'Authorization': `Bearer ${yourAuthToken}`
          },
        }
      );

      const { uploadUrl, filePath, downloadUrl } = response.data;

      // Step 2: Upload the file directly to Google Cloud Storage
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      // Step 3: Store the file reference in your application
      // This depends on your specific use case (e.g., saving to an expense record)
      console.log("File uploaded successfully. Path:", filePath);

      setUploadedFileUrl(downloadUrl);
      setUploading(false);

      // Here you might want to update your expense record with the filePath
      // await saveExpenseWithFile(expenseId, filePath);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload Receipt</h2>

      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
        accept="image/jpeg,image/png,image/gif,application/pdf"
      />

      <button onClick={uploadFile} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploading && (
        <div>
          <progress value={uploadProgress} max="100" />
          <span>{uploadProgress}%</span>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {uploadedFileUrl && (
        <div>
          <p>File uploaded successfully!</p>
          {uploadedFileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
            <img
              src={uploadedFileUrl}
              alt="Uploaded file"
              style={{ maxWidth: "300px" }}
            />
          ) : (
            <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">
              View uploaded file
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
```

### Troubleshooting CORS Issues

If you're still experiencing CORS issues after setting up the server-side configuration, try these additional steps:

1. **Check the browser console** for specific CORS error messages to identify which headers or methods are being blocked.

2. **Add additional HTTP headers** to the presigned URL request if needed:

```jsx
// When making the PUT request to upload
await axios.put(uploadUrl, file, {
  headers: {
    "Content-Type": file.type,
    "Access-Control-Allow-Origin": "*",
    // Add any other required headers here
  },
  // ...other options
});
```

3. **Test with simpler code first**:

```javascript
// Simple fetch version for testing
fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type },
  body: file,
})
  .then((response) => console.log("Upload successful", response))
  .catch((error) => console.error("Upload failed", error));
```

4. **Add a preflight check** if needed:

```javascript
// Check if we have CORS access before trying to upload
fetch(uploadUrl, {
  method: "OPTIONS",
})
  .then((response) => {
    console.log("OPTIONS response:", response);
    // If successful, proceed with the actual upload
    // ...
  })
  .catch((error) => console.error("Preflight check failed:", error));
```

Remember that CORS issues can sometimes be caused by browser extensions or network configurations. Try testing in an incognito/private window with extensions disabled.
