-- Schema for Compliance Copilot using Supabase PostgreSQL
-- This schema defines the database structure for an emergency management compliance application
-- The system stores plans, reference documents, and performs gap analysis between them
-- Key components:
--   1. Documents: Stores both plans and reference documents in a unified table
--   2. Vector Embeddings: Stores text chunks with vector embeddings for semantic search
--   3. Plan Analysis: Stores results of AI-driven gap analysis between plans and reference documents
--   4. Requirements: Stores structured requirements extracted from reference documents

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;     -- For vector similarity search using pgvector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation

-- Create users table
-- Stores user account information for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Unique identifier for users
  name TEXT NOT NULL,                            -- Full name of the user
  email TEXT NOT NULL UNIQUE,                    -- Email address (used for login)
  password TEXT NOT NULL,                        -- Hashed password (never store plain text)
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')), -- User role for access control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()                    -- Account creation timestamp
);

-- Documents Table - For both reference documents and plans
-- Unified table that stores metadata for both emergency management plans and reference documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type VARCHAR(20) NOT NULL, -- Document category: 'reference' or 'plan'
  doc_subtype VARCHAR(50) NOT NULL,   -- Specific type: 'EOP', 'HMP', 'COOP', 'standard', 'guideline', etc.
  title VARCHAR(255) NOT NULL,        -- Document title
  description TEXT,                   -- Document description or summary
  status VARCHAR(20),                 -- Document status: 'draft', 'in_review', 'active', 'archived'
  user_id UUID REFERENCES users(id),  -- User who uploaded/created the document
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Creation timestamp
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Last modification timestamp
  tags TEXT[],                        -- Array of tags for categorization and filtering
  version INTEGER DEFAULT 1,          -- Document version number
  department VARCHAR(100),            -- Department responsible for the document (for plans)
  source_org VARCHAR(255),            -- Source organization (for reference documents)
  pub_date DATE,                      -- Publication date
  authority_level VARCHAR(50),        -- For reference docs: 'guideline', 'requirement', 'regulation'
  last_review_date DATE,              -- Date when document was last reviewed
  next_review_date DATE,              -- Date when document needs to be reviewed next
  owner VARCHAR(100),                 -- Person responsible for the document
  compliance_score NUMERIC(5,2),      -- Overall compliance score (for plans only)
  file_url TEXT,                      -- Path to the uploaded file in storage
  metadata JSONB                      -- Flexible storage for additional document metadata
);

-- Vector Embeddings Table - Stores chunked content with vector embeddings
-- This table contains text chunks from documents with their vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS vector_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE, -- Link to parent document
  content TEXT NOT NULL,             -- The actual text chunk content
  embedding VECTOR(1536),            -- Vector embedding (1536 dimensions for OpenAI's ada-002 model)
  metadata JSONB,                    -- Additional context about the chunk (section title, importance, etc.)
  chunk_index INTEGER,               -- Position of this chunk in the original document
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Creation timestamp
);

-- Requirements Table - Stores structured requirements extracted from reference documents
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,                    -- The actual requirement text
  section VARCHAR(100) NOT NULL,         -- Which section of a plan this applies to
  importance VARCHAR(20) NOT NULL,       -- critical, important, or recommended
  source_section VARCHAR(255),           -- Section in the reference document
  keywords TEXT[],                       -- Keywords for searching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requirement Sources Table - Maps requirements to source documents
-- Using ON DELETE CASCADE to ensure when a document is deleted, all its requirements are also deleted
CREATE TABLE IF NOT EXISTS requirement_sources (
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (requirement_id, document_id)
);

-- Standard Mappings Table - Maps equivalent requirements across standards
CREATE TABLE IF NOT EXISTS standard_mappings (
  requirement_id_1 UUID REFERENCES requirements(id) ON DELETE CASCADE,
  requirement_id_2 UUID REFERENCES requirements(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- equivalent, related, etc.
  PRIMARY KEY (requirement_id_1, requirement_id_2)
);

-- Analysis Findings Table - Stores detailed findings for each requirement
CREATE TABLE IF NOT EXISTS analysis_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES plan_analysis(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  is_present BOOLEAN NOT NULL,
  quality_rating VARCHAR(20),            -- poor, adequate, excellent
  evidence TEXT,                         -- Text evidence from the plan
  location VARCHAR(255),                 -- Where in the plan it was found
  recommendations TEXT,                  -- Improvement recommendations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector search
-- This optimizes vector similarity search performance using the IVFFlat algorithm
CREATE INDEX IF NOT EXISTS vector_embeddings_idx ON vector_embeddings 
USING ivfflat (embedding vector_cosine_ops) -- Use cosine similarity for comparison
WITH (lists = 100);                        -- Number of lists for partitioning the vector space

-- Create function for vector similarity search
-- This is a PL/pgSQL function for semantic search in the vector database
CREATE OR REPLACE FUNCTION match_references(
  query_embedding VECTOR(1536),       -- Input embedding vector to search against
  match_threshold FLOAT,              -- Minimum similarity score (0.0 to 1.0) to include in results
  match_count INT                     -- Maximum number of matching results to return
)
RETURNS TABLE (
  id UUID,                            -- Embedding ID
  document_id UUID,                   -- Parent document ID
  content TEXT,                       -- Text content of the chunk
  chunk_index INTEGER,                -- Position in document
  metadata JSONB,                     -- Additional metadata about the chunk
  similarity FLOAT                    -- Similarity score (higher is better)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.document_id,
    e.content,
    e.chunk_index,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity  -- Convert distance to similarity score
  FROM vector_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold  -- Filter by threshold
  ORDER BY similarity DESC   -- Return most similar results first
  LIMIT match_count;         -- Limit number of results
END;
$$;

-- Gap Analysis Results Table
-- Stores the results of automated compliance gap analysis performed on plans
CREATE TABLE IF NOT EXISTS plan_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- Plan that was analyzed
  overall_score NUMERIC(5,2) NOT NULL,      -- Overall compliance score (0-100)
  missing_elements_count INTEGER NOT NULL DEFAULT 0, -- Number of missing elements found
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When analysis was performed
  analysis_data JSONB,                      -- Detailed analysis results
  created_by UUID REFERENCES users(id),      -- User who initiated the analysis
  quality_score NUMERIC(5,2),               -- Overall quality score
  section_scores JSONB,                     -- Scores broken down by section
  standards_used UUID[]                     -- Reference standards used in analysis
);

-- Trigger to update the updated_at timestamp
-- Automatically updates the updated_at column whenever a row is modified
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); -- Set updated_at to current timestamp
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for the documents table to track last modification time
CREATE TRIGGER update_documents_modtime
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create storage bucket policies
-- These policies control access to files in Supabase Storage buckets

-- For 'plans' bucket (emergency management plans)
CREATE POLICY "Allow users to upload plan files" ON storage.objects
FOR INSERT TO authenticated         -- Only authenticated users can upload
WITH CHECK (bucket_id = 'plans');   -- Only to the plans bucket

CREATE POLICY "Allow users to view plan files" ON storage.objects
FOR SELECT TO authenticated       -- Only authenticated users can view
USING (bucket_id = 'plans');      -- Only from the plans bucket

-- For 'reference-documents' bucket (reference standards and guidelines)
CREATE POLICY "Allow users to view reference documents" ON storage.objects
FOR SELECT TO authenticated              -- Only authenticated users can view
USING (bucket_id = 'reference-documents'); -- Only from the reference-documents bucket

CREATE POLICY "Allow users to upload reference documents" ON storage.objects
FOR INSERT TO authenticated              -- Only authenticated users can upload
WITH CHECK (bucket_id = 'reference-documents'); -- Only to the reference-documents bucket

-- Enable Row Level Security (RLS) for all tables
-- RLS ensures that users can only access rows they are authorized to access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;              -- Protect user accounts
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;          -- Protect documents
ALTER TABLE vector_embeddings ENABLE ROW LEVEL SECURITY;  -- Protect embeddings
ALTER TABLE plan_analysis ENABLE ROW LEVEL SECURITY;      -- Protect analysis results
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;       -- Protect requirements
ALTER TABLE requirement_sources ENABLE ROW LEVEL SECURITY; -- Protect requirement sources
ALTER TABLE standard_mappings ENABLE ROW LEVEL SECURITY;  -- Protect standard mappings
ALTER TABLE analysis_findings ENABLE ROW LEVEL SECURITY;  -- Protect analysis findings

-- Create policies for documents table
-- These policies control which rows users can access in the documents table
CREATE POLICY "Users can insert documents" 
ON documents 
FOR INSERT                      -- For INSERT operations
TO authenticated                -- Only authenticated users
WITH CHECK (user_id = auth.uid()); -- Can only insert documents they own

CREATE POLICY "Users can view documents" 
ON documents 
FOR SELECT                      -- For SELECT operations
TO authenticated                -- Only authenticated users
USING (true);                   -- Can view all documents

-- Create policies for vector_embeddings table
-- These policies control which rows users can access in the vector_embeddings table
CREATE POLICY "Users can insert vector embeddings" 
ON vector_embeddings 
FOR INSERT                       -- For INSERT operations
TO authenticated                 -- Only authenticated users
WITH CHECK (document_id IN       -- Can only insert embeddings for documents they own
  (SELECT id FROM documents WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view vector embeddings" 
ON vector_embeddings 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all embeddings

-- Create policies for plan_analysis table
-- These policies control which rows users can access in the plan_analysis table
CREATE POLICY "Users can insert plan analysis" 
ON plan_analysis 
FOR INSERT                       -- For INSERT operations
TO authenticated                 -- Only authenticated users
WITH CHECK (plan_id IN           -- Can only insert analysis for plans they own
  (SELECT id FROM documents WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view plan analysis" 
ON plan_analysis 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all analysis results

-- Create policies for requirements table
CREATE POLICY "Users can insert requirements" 
ON requirements 
FOR INSERT                       -- For INSERT operations
TO authenticated;                -- Only authenticated users

CREATE POLICY "Users can view requirements" 
ON requirements 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all requirements

-- Create policies for requirement_sources table
CREATE POLICY "Users can insert requirement sources" 
ON requirement_sources 
FOR INSERT                       -- For INSERT operations
TO authenticated;                -- Only authenticated users

CREATE POLICY "Users can view requirement sources" 
ON requirement_sources 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all requirement sources

-- Create policies for standard_mappings table
CREATE POLICY "Users can insert standard mappings" 
ON standard_mappings 
FOR INSERT                       -- For INSERT operations
TO authenticated;                -- Only authenticated users

CREATE POLICY "Users can view standard mappings" 
ON standard_mappings 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all standard mappings

-- Create policies for analysis_findings table
CREATE POLICY "Users can insert analysis findings" 
ON analysis_findings 
FOR INSERT                       -- For INSERT operations
TO authenticated;                -- Only authenticated users

CREATE POLICY "Users can view analysis findings" 
ON analysis_findings 
FOR SELECT                       -- For SELECT operations
TO authenticated                 -- Only authenticated users
USING (true);                    -- Can view all analysis findings

-- Add a sample admin user for testing
-- This creates an initial administrator account that can be used to set up the system
INSERT INTO users (name, email, password, role)
VALUES (
  'Admin User',                  -- Display name
  'admin@example.com',           -- Login email
  -- bcrypt hash for 'admin123'  -- Password (hashed)
  '$2a$10$yLjK3aat1eMnB1xtLCuHXO9yExkfMDCODhdYO40suQ58mRF4YL4mG',
  'admin'                        -- Administrator role
) ON CONFLICT (email) DO NOTHING;  -- Skip if this user already exists