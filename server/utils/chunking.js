// server/utils/chunking.js
const chunkDocument = (content, options = {}) => {
    const {
      maxChunkSize = 2000,
      minChunkSize = 400,
      chunkOverlap = 200,
      preserveHeaders = true
    } = options;
    
    let chunks = [];
    
    if (content.length <= maxChunkSize) {
      // If content is small enough, return as a single chunk
      return [{ id: 0, text: content, type: 'document' }];
    }
    
    // Split by headers or paragraphs
    if (preserveHeaders) {
      // First identify headers using regex (e.g., Section 1, 1.1, etc.)
      const headerPattern = /(?:^|\n)((?:\d+\.?)+|(?:[A-Z][a-z]*\s?)+:)\s*([^\n]+)/g;
      const sections = [];
      let lastIndex = 0;
      let match;
      
      while ((match = headerPattern.exec(content)) !== null) {
        const headerStart = match.index;
        if (headerStart > lastIndex) {
          // Add text before this header
          sections.push({
            type: 'content',
            text: content.substring(lastIndex, headerStart)
          });
        }
        
        sections.push({
          type: 'header',
          text: match[0],
          level: match[1].split('.').length // Estimate header level
        });
        
        lastIndex = headerStart + match[0].length;
      }
      
      // Add remaining content
      if (lastIndex < content.length) {
        sections.push({
          type: 'content',
          text: content.substring(lastIndex)
        });
      }
      
      // Now chunk by combining headers with content to stay within size limits
      let currentChunk = "";
      let currentHeaders = [];
      
      sections.forEach((section, idx) => {
        if (section.type === 'header') {
          currentHeaders.push(section.text);
          // If we have content in the current chunk, finish it
          if (currentChunk.length > 0) {
            chunks.push({
              id: chunks.length,
              text: currentChunk,
              type: 'section'
            });
            currentChunk = currentHeaders.join('\n') + '\n';
          } else {
            currentChunk += section.text + '\n';
          }
        } else {
          // If adding this content would make the chunk too big
          if (currentChunk.length + section.text.length > maxChunkSize) {
            // First finish the current chunk
            chunks.push({
              id: chunks.length,
              text: currentChunk,
              type: 'section'
            });
            
            // Then split the content itself into smaller chunks
            let contentToChunk = section.text;
            while (contentToChunk.length > 0) {
              let chunkSize = Math.min(contentToChunk.length, maxChunkSize - currentHeaders.join('\n').length - 10);
              let chunkText = currentHeaders.join('\n') + '\n' + contentToChunk.substring(0, chunkSize);
              
              chunks.push({
                id: chunks.length,
                text: chunkText,
                type: 'section'
              });
              
              // Move to next chunk of content with overlap
              let nextStart = chunkSize - chunkOverlap;
              if (nextStart <= 0) break; // Avoid infinite loop
              contentToChunk = contentToChunk.substring(nextStart);
            }
            
            currentChunk = "";
          } else {
            currentChunk += section.text;
          }
        }
      });
      
      // Add any remaining content
      if (currentChunk.length > 0) {
        chunks.push({
          id: chunks.length,
          text: currentChunk,
          type: 'section'
        });
      }
    } else {
      // Simpler approach: split by paragraphs
      const paragraphs = content.split(/\n\s*\n/);
      
      let currentChunk = "";
      paragraphs.forEach((para) => {
        if (currentChunk.length + para.length + 2 > maxChunkSize) {
          chunks.push({
            id: chunks.length,
            text: currentChunk,
            type: 'paragraph'
          });
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      });
      
      if (currentChunk) {
        chunks.push({
          id: chunks.length,
          text: currentChunk,
          type: 'paragraph'
        });
      }
    }
    
    return chunks;
  };
  
  module.exports = {
    chunkDocument
  };