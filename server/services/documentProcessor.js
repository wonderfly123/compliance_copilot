// server/services/documentProcessor.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { storeDocumentEmbeddings, createEmbedding } = require('./embedding');
const { chunkDocument } = require('../utils/chunking');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const readFile = promisify(fs.readFile);
const { supabase, getClientWithUserId } = require('../utils/supabaseAuth');

/**
 * Process an uploaded document: extract text, chunk it, and create embeddings
 * @param {Object} fileInfo - Information about the uploaded file
 * @param {Object} metadata - Document metadata
 * @returns {Promise<Object>} - Processing result
 */
const processDocument = async (fileInfo, metadata) => {
  try {
    console.log('Processing document:', fileInfo.originalname);
    
    // Get client with user ID header for RLS policies
    const client = metadata.userId ? 
      getClientWithUserId(metadata.userId) : 
      supabase;
    
    console.log('Using client with user ID:', metadata.userId || 'none');
    
    // 1. Extract text from the document
    const text = await extractTextFromFile(fileInfo.path, fileInfo.mimetype);
    console.log(`Extracted ${text.length} characters of text`);
    
    // 2. Chunk the document text
    const chunks = chunkDocument(text, {
      maxChunkSize: 2000,
      minChunkSize: 400,
      chunkOverlap: 200,
      preserveHeaders: true
    });
    console.log(`Created ${chunks.length} chunks from document`);
    
    // 3. Prepare document metadata
    const documentData = {
      document_type: metadata.documentType, // 'reference' or 'plan'
      doc_subtype: metadata.type, // EOP, HMP, standard, etc.
      title: metadata.title,
      description: metadata.description || '',
      status: metadata.status || 'active',
      user_id: metadata.userId,
      tags: metadata.tags || [],
      department: metadata.department || '',
      source_org: metadata.sourceOrg || '',
      pub_date: metadata.publicationDate || null,
      authority_level: metadata.authorityLevel || null,
      owner: metadata.owner || '',
      metadata: {}
    };
    
    // 4. Store the original file in Supabase Storage
    const fileExt = path.extname(fileInfo.originalname);
    const fileName = `${Date.now()}${fileExt}`;
    const bucketName = metadata.documentType === 'reference' ? 'reference-documents' : 'plans';
    
    const fileBuffer = await readFile(fileInfo.path);
    
    console.log(`Uploading to storage bucket: ${bucketName}/${fileName}`);
    
    // Function to attempt upload with retries
    const attemptUpload = async (retries = 3, timeout = 30000) => {
      try {
        // Create a custom client with longer timeout for this specific upload
        const customClient = getClientWithUserId(metadata.userId, { 
          global: { 
            fetch: (url, init) => {
              // Set a longer timeout for fetch operations
              // Create abort controller with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeout);
              
              return fetch(url, { 
                ...init, 
                signal: controller.signal
              }).finally(() => clearTimeout(timeoutId));
            }
          }
        });
        
        console.log(`Attempting upload with ${timeout}ms timeout...`);
        const { data: uploadData, error: uploadError } = await customClient
          .storage
          .from(bucketName)
          .upload(fileName, fileBuffer, {
            contentType: fileInfo.mimetype,
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        return uploadData;
      } catch (error) {
        console.error(`Upload attempt failed (${retries} retries left):`, error.message);
        if (retries <= 0) throw error;
        
        // Exponential backoff with jitter
        const delay = Math.floor(Math.random() * 1000) + (4 - retries) * 2000;
        console.log(`Retrying upload in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase timeout for next attempt
        return attemptUpload(retries - 1, timeout + 30000);
      }
    };
    
    // Try upload with retries
    try {
      const uploadData = await attemptUpload();
      console.log('File uploaded successfully');
    } catch (uploadError) {
      console.error('Error uploading file to storage after retries:', uploadError);
      throw new Error(`File upload failed: ${uploadError.message}`);
    }
    
    // 5. Create document record in database
    documentData.file_url = fileName;
    console.log('Creating document record in database');
    const { data: docData, error: docError } = await client
      .from('documents')
      .insert([documentData])
      .select('id')
      .single();
    
    if (docError) {
      console.error('Error creating document record:', docError);
      throw docError;
    }
    
    // 6. Create embeddings and store in vector database
    console.log(`Creating embeddings for ${chunks.length} chunks`);
    const documentId = docData.id;
    
    // Process and store each chunk with its embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Prepare metadata for this chunk
      const chunkMetadata = {
        section_title: chunk.title || '',
        chunk_type: chunk.type || 'text',
        chunk_index: i,
        document_title: metadata.title,
        importance_level: chunk.importance || 'medium'
      };
      
      // Generate embedding for this chunk
      const embedding = await createEmbedding(chunk.text);
      
      // Store in vector_embeddings table
      const { error: chunkError } = await client
        .from('vector_embeddings')
        .insert([{
          document_id: documentId,
          content: chunk.text,
          embedding,
          metadata: chunkMetadata,
          chunk_index: i
        }]);
      
      if (chunkError) {
        console.error(`Error storing chunk ${i} embedding:`, chunkError);
        throw chunkError;
      }
      
      // Log progress for long documents
      if (chunks.length > 10 && i % 10 === 0) {
        console.log(`Processed ${i}/${chunks.length} chunks`);
      }
    }
    
    // 7. Clean up temporary file
    fs.unlinkSync(fileInfo.path);
    console.log('Document processing complete');
    
    return {
      success: true,
      documentId,
      chunkCount: chunks.length
    };
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Attempt to clean up temp file if it exists
    try {
      if (fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }
    
    throw new Error(`Failed to process document: ${error.message}`);
  }
};

/**
 * Extract text content from different file types
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    console.log(`Extracting text from ${mimeType} file: ${filePath}`);
    const fileBuffer = await readFile(filePath);
    console.log(`File size: ${fileBuffer.length} bytes`);
    
    // Handle different file types
    if (mimeType === 'application/pdf') {
      // PDF files with enhanced error handling
      console.log('Starting PDF parsing process...');
      try {
        // Add PDF parser options for more details
        const options = {
          // Set to -1 to parse all pages
          max: -1,
          // Get version info
          version: true
        };
        
        console.log('PDF parser options:', options);
        const pdfData = await pdf(fileBuffer, options);
        
        console.log('PDF parsed successfully.');
        console.log('PDF version:', pdfData.info?.PDFFormatVersion || 'unknown');
        console.log('PDF page count:', pdfData.numpages);
        console.log('PDF text length:', pdfData.text.length);
        
        // Check if we got any text
        if (!pdfData.text || pdfData.text.length === 0) {
          console.warn('Warning: PDF parsed but no text was extracted');
        }
        
        return pdfData.text;
      } catch (pdfError) {
        console.error('Detailed PDF parsing error:', pdfError);
        
        // Try to get more details about the error
        console.error('Error name:', pdfError.name);
        console.error('Error message:', pdfError.message);
        console.error('Error details:', pdfError.details);
        
        // Try alternative approach - basic text extraction from buffer
        console.log('Attempting fallback text extraction...');
        try {
          // Simple string extraction from buffer - will be messy but might work
          const rawText = fileBuffer.toString('utf8')
            .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable chars
            .replace(/\s+/g, ' '); // Normalize whitespace
          
          console.log('Fallback extraction produced', rawText.length, 'characters');
          
          if (rawText.length > 100) {
            console.log('Using fallback extraction result');
            return `[PDF Parser Error: ${pdfError.message}]\n\n${rawText}`;
          } else {
            throw new Error(`PDF parsing failed: ${pdfError.message}`);
          }
        } catch (fallbackError) {
          console.error('Fallback extraction also failed:', fallbackError);
          throw new Error(`Failed to extract text: ${pdfError.message}`);
        }
      }
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX files
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else if (mimeType === 'application/msword') {
      // DOC files
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else if (mimeType === 'text/plain') {
      // Plain text files
      return fileBuffer.toString('utf8');
    } else if (mimeType === 'text/markdown' || mimeType === 'application/markdown') {
      // Markdown files
      return fileBuffer.toString('utf8');
    } else if (mimeType === 'application/json') {
      // JSON files - extract text content
      const jsonContent = JSON.parse(fileBuffer.toString('utf8'));
      return JSON.stringify(jsonContent, null, 2);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

/**
 * Process a batch of documents (for bulk imports)
 * @param {Array} files - Array of file information objects
 * @param {Object} commonMetadata - Metadata common to all files
 * @returns {Promise<Array>} - Array of processing results
 */
const processBatchDocuments = async (files, commonMetadata) => {
  const results = [];
  
  for (const file of files) {
    try {
      // Process each file and track results
      const result = await processDocument(file, commonMetadata);
      results.push({
        filename: file.originalname,
        success: true,
        documentId: result.documentId
      });
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  processDocument,
  processBatchDocuments,
  extractTextFromFile
};