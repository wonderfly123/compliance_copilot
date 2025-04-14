const { supabase } = require('../config/db');

const ReferenceDocument = {
  // Get all reference documents
  async findAll(filters = {}) {
    let query = supabase
      .from('reference_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters if provided
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // Find reference document by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('reference_documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  },
  
  // Create reference document
  async create(referenceData) {
    const { data, error } = await supabase
      .from('reference_documents')
      .insert([{
        ...referenceData,
        created_at: new Date()
      }])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data[0];
  },
  
  // Update reference document
  async update(id, referenceData) {
    const { data, error } = await supabase
      .from('reference_documents')
      .update(referenceData)
      .eq('id', id)
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data[0];
  },
  
  // Delete reference document
  async delete(id) {
    // First, delete associated embeddings
    const { error: embeddingError } = await supabase
      .from('reference_embeddings')
      .delete()
      .eq('reference_id', id);
    
    if (embeddingError) {
      throw new Error(embeddingError.message);
    }
    
    // Then delete the document
    const { error } = await supabase
      .from('reference_documents')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // Upload file to storage
  async uploadFile(file, filePath) {
    const { data, error } = await supabase
      .storage
      .from('reference-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('reference-documents')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  },
  
  // Store reference embeddings
  async storeEmbeddings(referenceId, embeddings) {
    // Embeddings should be an array of objects:
    // [{ text: 'chunk text', embedding: [vector values], chunk_id: 1 }]
    
    const embeddingsToInsert = embeddings.map(item => ({
      reference_id: referenceId,
      chunk_text: item.text,
      chunk_id: item.chunk_id,
      embedding: item.embedding
    }));
    
    const { data, error } = await supabase
      .from('reference_embeddings')
      .insert(embeddingsToInsert);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // Search reference documents using vector similarity
  async search(query, filters = {}, limit = 10) {
    // This is a placeholder for the actual embedding generation
    // In production, replace with a call to OpenAI or other embedding service
    const generateEmbedding = async (text) => {
      console.log('Generating embedding for:', text);
      // Return mock data for now - replace with actual embedding generation
      return [0.1, 0.2, 0.3]; // Simplified mock embedding
    };
    
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    // Search using the embedding via a stored procedure
    // Note: You'll need to create this function in Supabase
    const { data, error } = await supabase.rpc('match_references', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: limit
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  }
};

module.exports = ReferenceDocument;