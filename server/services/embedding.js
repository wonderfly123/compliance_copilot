// server/services/embedding.js
const axios = require('axios');
const supabase = require('../config/supabase');

/**
 * Create embeddings for text using OpenAI's API
 * @param {string} text - The text to embed
 * @returns {Promise<Array>} - The embedding vector
 */
const createEmbedding = async (text) => {
  try {
    const openai = require('openai');
    const openaiClient = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error(`Failed to create embedding: ${error.message}`);
  }
};

/**
 * Store document chunks with embeddings in the vector database
 * @param {Object} document - Document metadata
 * @param {Array} chunks - Array of text chunks from the document
 * @returns {Promise<boolean>} - Success status
 */
const storeDocumentEmbeddings = async (document, chunks) => {
  try {
    // First store the document metadata
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert([document])
      .select('id')
      .single();
    
    if (docError) throw docError;
    
    const documentId = docData.id;
    
    // Process and store each chunk with its embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Prepare metadata for this chunk
      const chunkMetadata = {
        section_title: chunk.title || '',
        chunk_type: chunk.type || 'text',
        chunk_index: i,
        document_title: document.title,
        importance_level: chunk.importance || 'medium'
      };
      
      // Generate embedding for this chunk
      const embedding = await createEmbedding(chunk.text);
      
      // Store in vector_embeddings table
      const { error: chunkError } = await supabase
        .from('vector_embeddings')
        .insert([{
          document_id: documentId,
          content: chunk.text,
          embedding,
          metadata: chunkMetadata,
          chunk_index: i
        }]);
      
      if (chunkError) throw chunkError;
      
      // Log progress for long documents
      if (chunks.length > 10 && i % 10 === 0) {
        console.log(`Processed ${i}/${chunks.length} chunks`);
      }
    }
    
    // Update document to mark it as embedded
    if (document.document_type === 'reference') {
      await supabase
        .from('documents')
        .update({ metadata: { ...document.metadata, is_embedded: true } })
        .eq('id', documentId);
    }
    
    return true;
  } catch (error) {
    console.error('Error storing document embeddings:', error);
    throw new Error('Failed to store document embeddings');
  }
};

/**
 * Find similar documents based on a text query
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of similar documents
 */
const findSimilarDocuments = async (query, options = {}) => {
  try {
    const {
      matchThreshold = 0.7,
      matchCount = 5,
      documentType = null,
      documentId = null
    } = options;
    
    // Generate embedding for the query
    const embedding = await createEmbedding(query);
    
    // Search for similar documents
    const { data, error } = await supabase.rpc('match_references', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });
    
    if (error) throw error;
    
    // If document type specified, filter results
    let filteredResults = data;
    if (documentType) {
      // Get document IDs from results
      const docIds = [...new Set(data.map(r => r.document_id))];
      
      // Get document types
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, document_type')
        .in('id', docIds);
      
      if (docsError) throw docsError;
      
      // Create mapping of document ID to type
      const docTypeMap = {};
      docs.forEach(doc => {
        docTypeMap[doc.id] = doc.document_type;
      });
      
      // Filter by document type
      filteredResults = data.filter(r => docTypeMap[r.document_id] === documentType);
    }
    
    // If specific document ID provided, filter to just that document
    if (documentId) {
      filteredResults = filteredResults.filter(r => r.document_id === documentId);
    }
    
    return filteredResults;
  } catch (error) {
    console.error('Error finding similar documents:', error);
    throw new Error('Failed to search documents');
  }
};

module.exports = {
  createEmbedding,
  storeDocumentEmbeddings,
  findSimilarDocuments
};