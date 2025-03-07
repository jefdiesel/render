# Cloudflare R2 Integration Guide for A11yscan

This guide walks you through the process of setting up Cloudflare R2 storage with your A11yscan application running on Render.

## Overview

The integration allows your application to store all data in Cloudflare R2 storage, including:
- Scan result JSON data
- PDF reports
- CSV reports
- Screenshot images (if applicable)

This approach provides several benefits:
- Reduced disk usage on your Render instance
- More reliable and durable storage
- Potential for improved performance with Cloudflare's CDN
- Ability to scale without worrying about local disk limitations

## Prerequisites

Before you begin, ensure you have:
- A Cloudflare account with R2 enabled
- Access to your Render dashboard
- Access to your application's code repository

## Step 1: Set Up Cloudflare R2

1. Log in to your Cloudflare dashboard
2. Navigate to "R2" under "Storage"
3. Create a new bucket for your A11yscan application (e.g., `a11yscan-storage`)
4. Set up a custom domain for your bucket (optional but recommended):
   - Navigate to the bucket settings
   - Configure a custom domain or subdomain
   - Follow Cloudflare's instructions to verify domain ownership if required

5. Create API tokens with appropriate permissions:
   - Go to "R2 API Tokens"
   - Create a new API token with the following permissions:
     - Object Read
     - Object Write
     - Object Delete
   - Save your Access Key ID and Secret Access Key securely

## Step 2: Update Your Environment Variables on Render

1. Log in to your Render dashboard
2. Select your A11yscan service
3. Go to the "Environment" tab
4. Add the following environment variables:

```
STORAGE_USE_R2=true
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-bucket-name
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_PUBLIC_DOMAIN=your-bucket-domain.example.com
```

5. Click "Save Changes"

## Step 3: Update Your Code

The code changes have been implemented in the following files:

1. New R2 storage service: `services/storage/r2.js`
2. Updated configuration: `config/index.js`
3. Updated storage service: `services/storage.js`
4. Updated report generation: 
   - `services/reports/pdf.js`
   - `services/reports/csv.js`
5. Updated routes: `routes/reports.js`
6. Updated package.json with AWS SDK dependencies

Ensure all these files are pushed to your repository and deployed to Render.

## Step 4: Deploy Your Application

1. Push the code changes to your GitHub repository
2. Render will automatically rebuild and deploy your application
3. Monitor the build logs for any errors

## Step 5: Verify the Integration

1. After deployment, test the application by:
   - Initiating a new accessibility scan
   - Checking that scan data is being saved
   - Verifying that PDF and CSV reports are generated and accessible

2. Check your Cloudflare R2 dashboard to confirm that files are being uploaded correctly

## Step 6: Set Up CORS (If Needed)

If your application needs to directly access R2 resources from the browser:

1. Go to your bucket settings in the Cloudflare dashboard
2. Configure CORS rules to allow requests from your domains

Example CORS configuration:

```json
[
  {
    "AllowedOrigins": ["https://a11yscan.xyz", "https://render-cpug.onrender.com"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Troubleshooting

If you encounter issues:

1. **Connection Errors**: Verify your R2 credentials and account ID
   - Check the R2_ACCOUNT_ID and ensure it's just the numeric ID
   - Verify the Access Key and Secret Key are correct

2. **Missing Files**: Check your bucket configuration
   - Ensure the bucket exists and has the correct name
   - Verify that the API token has the necessary permissions

3. **Access Denied Errors**: Check your domain setup
   - If using a custom domain, ensure DNS is correctly configured
   - Check that CORS is properly set up if accessing directly from browsers

4. **Application Errors**: Check your logs
   - Render logs will show any application errors
   - Look for specific error messages related to R2 operations

## Maintenance

1. **Monitor Storage Usage**: Keep an eye on your R2 storage usage in the Cloudflare dashboard
2. **Implement File Cleanup**: Consider adding logic to clean up old reports to manage storage costs
3. **Backup Strategy**: While R2 is reliable, consider implementing a backup strategy for critical data

## Next Steps

- Set up a CDN worker for improved content delivery (optional)
- Implement signed URLs for more secure access to reports
- Consider setting up lifecycle policies to automatically delete old reports
