# Supabase Setup for Compliance Copilot

This document provides step-by-step instructions for setting up Supabase for the Compliance Copilot application.

## 1. Create a Supabase Account and Project

1. Go to [Supabase](https://supabase.com/) and sign up for an account if you don't already have one.
2. Create a new project by clicking "New Project" in the dashboard.
3. Choose a name for your project (e.g., "compliance-copilot").
4. Set a secure database password.
5. Choose the region closest to your users.
6. Click "Create Project" and wait for it to be created.

## 2. Set Up the Database Schema

1. Once your project is created, go to the "SQL Editor" tab.
2. Copy the contents of the `schema.sql` file in this directory.
3. Paste the SQL into the editor and click "Run".
4. This will create the necessary tables and functions for the application.

## 3. Set Up Storage Buckets

1. Go to the "Storage" tab in your Supabase dashboard.
2. Create the following buckets:
   - `plans` - For storing plan documents
   - `reference_documents` - For storing reference materials
3. Set appropriate policies for each bucket:

For `plans` bucket:
```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Allow users to upload plan files" ON storage.objects
FOR INSERT TO authenticated
USING (bucket_id = 'plans' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read only their own files
CREATE POLICY "Allow users to view their own plan files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'plans' AND auth.uid()::text = (storage.foldername(name))[1]);
```

For `reference_documents` bucket:
```sql
-- Allow authenticated users to read reference documents
CREATE POLICY "Allow users to view reference documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'reference_documents');

-- Allow only admins to upload reference documents
CREATE POLICY "Allow admins to upload reference documents" ON storage.objects
FOR INSERT TO authenticated
USING (
  bucket_id = 'reference_documents' AND 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## 4. Get API Keys and Configuration

1. Go to the "Settings" tab and then "API" in your Supabase dashboard.
2. Copy the "URL" and "anon public" key.
3. Create a `.env` file in the server directory with the following content:

```
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_key_here
```

4. Replace the placeholders with your actual Supabase URL and API key.

## 5. Initial Data Setup (Optional)

You may want to create an initial admin user to manage reference documents. You can do this with the following SQL:

```sql
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin User',
  'admin@example.com',
  -- This is a bcrypt hash for 'password123' - replace with a properly hashed password in production
  '$2a$10$3QRGg7SStKY3xWQzE5RVbuhkh1ZUIpjKB8v1qD3XyM7emdEcJjw4K',
  'admin'
);
```

## 6. Vector Embeddings Setup

For the document search functionality to work properly, you'll need to:

1. Set up a process to generate embeddings for uploaded reference documents
2. Configure the application to use an embedding service like OpenAI's text-embedding-ada-002 model
3. When implementing the actual embedding generation, replace the placeholder in the `ReferenceDocuments.search` method

## Troubleshooting

- If you encounter permission issues, make sure your storage policies are correctly set up.
- If vector searches aren't working, ensure that the pgvector extension is properly installed.
- For additional support, refer to the [Supabase documentation](https://supabase.com/docs).