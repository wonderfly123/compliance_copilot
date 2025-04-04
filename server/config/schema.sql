-- Schema for Compliance Copilot using Supabase PostgreSQL
-- This file contains the SQL statements to create the tables and functions
-- needed for the application

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('EOP', 'HMP', 'COOP', 'IAP', 'AAR', 'Other')),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Review', 'Final', 'Needs Review')),
  location TEXT NOT NULL,
  compliance_score INTEGER DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  critical_sections INTEGER DEFAULT 0,
  expiration_date TIMESTAMP WITH TIME ZONE,
  file_url TEXT,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  owner UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reference_documents table
CREATE TABLE IF NOT EXISTS reference_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source TEXT,
  publication_date TIMESTAMP WITH TIME ZONE,
  file_url TEXT,
  is_embedded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reference_embeddings table for vector search
CREATE TABLE IF NOT EXISTS reference_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id UUID NOT NULL REFERENCES reference_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_id INTEGER NOT NULL,
  embedding VECTOR(1536), -- Assuming OpenAI embeddings with 1536 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector search
CREATE INDEX IF NOT EXISTS reference_embeddings_idx ON reference_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_references(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  reference_id UUID,
  chunk_text TEXT,
  chunk_id INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.reference_id,
    e.chunk_text,
    e.chunk_id,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM reference_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Create storage buckets
-- Note: This must be done through the Supabase dashboard or API,
-- but included here for completeness
-- 1. Create a bucket named 'plans' for plan documents
-- 2. Create a bucket named 'reference_documents' for reference materials

-- Create plans_sections table for detailed section-by-section compliance tracking
CREATE TABLE IF NOT EXISTS plan_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_type TEXT, -- Standardized section type for similar sections across different plans
  section_content TEXT,
  section_order INTEGER NOT NULL, -- For maintaining the order of sections
  parent_section_id UUID REFERENCES plan_sections(id), -- For hierarchical section structure
  compliance_score INTEGER DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  is_critical BOOLEAN DEFAULT FALSE,
  ai_suggestions TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_templates table for reusable section templates
CREATE TABLE IF NOT EXISTS plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  plan_type TEXT NOT NULL, -- EOP, HMP, COOP, etc.
  description TEXT,
  created_by UUID REFERENCES users(id),
  is_system_template BOOLEAN DEFAULT FALSE, -- Flag for system-provided templates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_sections table for sections within templates
CREATE TABLE IF NOT EXISTS template_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES plan_templates(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_type TEXT NOT NULL,
  section_description TEXT,
  section_order INTEGER NOT NULL,
  parent_section_id UUID REFERENCES template_sections(id),
  is_required BOOLEAN DEFAULT FALSE,
  is_critical BOOLEAN DEFAULT FALSE,
  compliance_rules JSONB, -- Rules for compliance checking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update plans.updated_at whenever a record changes
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_modtime
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_reference_documents_modtime
BEFORE UPDATE ON reference_documents
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();