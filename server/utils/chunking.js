// server/utils/chunking.js
const chunkDocument = (content, options = {}) => {
  // Calculate adaptive parameters based on content length
  const contentLength = content.length;
  const documentSizeInKB = contentLength / 1024;
  
  // Dynamically adjust parameters based on document size
  const getAdaptiveParams = (sizeInKB) => {
    if (sizeInKB < 100) {
      // Small documents (< 100KB)
      return {
        maxChunkSize: 3000,
        minChunkSize: 500,
        chunkOverlap: 150,
        targetChunks: 10
      };
    } else if (sizeInKB < 500) {
      // Medium documents (100KB - 500KB)
      return {
        maxChunkSize: 5000,
        minChunkSize: 1000,
        chunkOverlap: 200, 
        targetChunks: 50
      };
    } else if (sizeInKB < 2000) {
      // Large documents (500KB - 2MB)
      return {
        maxChunkSize: 8000,
        minChunkSize: 2000,
        chunkOverlap: 300,
        targetChunks: 150
      };
    } else {
      // Very large documents (> 2MB)
      return {
        maxChunkSize: 10000,
        minChunkSize: 3000,
        chunkOverlap: 400,
        targetChunks: 250
      };
    }
  };
  
  // Get adaptive parameters
  const adaptiveParams = getAdaptiveParams(documentSizeInKB);
  
  // Apply user options with adaptive defaults
  const {
    maxChunkSize = adaptiveParams.maxChunkSize,
    minChunkSize = adaptiveParams.minChunkSize,
    chunkOverlap = adaptiveParams.chunkOverlap,
    preserveHeaders = true,
    preserveParagraphs = true
  } = options;
  
  // Estimate an ideal chunk size based on content length and target chunks
  const idealChunkSize = Math.max(
    minChunkSize,
    Math.min(maxChunkSize, Math.ceil(contentLength / adaptiveParams.targetChunks))
  );
  
  let chunks = [];
  
  // Single chunk for very small documents
  if (contentLength <= maxChunkSize) {
    return [{ id: 0, text: content, type: 'document' }];
  }
  
  // Header detection pattern
  const headerPattern = /(?:^|\n)(?:((?:\d+\.)+\d+|(?:\d+\.?))(?:\s+|$)|(?:(?:Section|Chapter|Part|Appendix|Title)\s+[\dA-Z]+[\.:]?)|\b(?:[A-Z][A-Z\s]{2,}:))\s*([^\n]+)/g;
  
  if (preserveHeaders) {
    const sections = [];
    let lastIndex = 0;
    let match;
    
    while ((match = headerPattern.exec(content)) !== null) {
      const headerStart = match.index;
      if (headerStart > lastIndex) {
        sections.push({
          type: 'content',
          text: content.substring(lastIndex, headerStart)
        });
      }
      
      sections.push({
        type: 'header',
        text: match[0],
        level: match[1] ? match[1].split('.').length : 1
      });
      
      lastIndex = headerStart + match[0].length;
    }
    
    if (lastIndex < content.length) {
      sections.push({
        type: 'content',
        text: content.substring(lastIndex)
      });
    }
    
    let currentChunk = "";
    let currentHeaders = [];
    let topLevelHeader = null;
    
    sections.forEach((section, idx) => {
      if (section.type === 'header') {
        if (!section.level || section.level === 1) {
          topLevelHeader = section.text;
        }
        
        if (section.level && section.level > 1) {
          currentHeaders = currentHeaders.filter(h => h.level < section.level);
          currentHeaders.push(section);
        } else {
          currentHeaders = [section];
        }
        
        if (currentChunk.length > minChunkSize && (!section.level || section.level <= 2)) {
          chunks.push({
            id: chunks.length,
            text: currentChunk,
            type: 'section',
            title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
          });
          currentChunk = currentHeaders.map(h => h.text).join('\n') + '\n';
        } else {
          currentChunk += section.text + '\n';
        }
      } else {
        const contentText = section.text;
        
        if (currentChunk.length + contentText.length > idealChunkSize * 1.5) {
          if (currentChunk.length > 0) {
            chunks.push({
              id: chunks.length,
              text: currentChunk,
              type: 'section',
              title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
            });
          }
          
          if (contentText.length > idealChunkSize) {
            const headerContext = currentHeaders.map(h => h.text).join('\n');
            
            if (preserveParagraphs) {
              const paragraphs = contentText.split(/\n\s*\n/);
              let paragraphChunk = headerContext.length > 0 ? headerContext + '\n\n' : "";
              
              paragraphs.forEach((para, i) => {
                if (paragraphChunk.length + para.length > idealChunkSize && paragraphChunk.length > minChunkSize) {
                  chunks.push({
                    id: chunks.length,
                    text: paragraphChunk,
                    type: 'section',
                    title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
                  });
                  paragraphChunk = headerContext.length > 0 ? headerContext + '\n\n' : "";
                }
                
                paragraphChunk += para + (i < paragraphs.length - 1 ? '\n\n' : '');
              });
              
              if (paragraphChunk.length > 0 && paragraphChunk !== headerContext + '\n\n') {
                chunks.push({
                  id: chunks.length,
                  text: paragraphChunk,
                  type: 'section',
                  title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
                });
              }
            } else {
              let contentPos = 0;
              while (contentPos < contentText.length) {
                const chunkEnd = Math.min(contentPos + idealChunkSize, contentText.length);
                const chunkWithContext = (headerContext.length > 0 ? headerContext + '\n\n' : "") + 
                                         contentText.substring(contentPos, chunkEnd);
                
                chunks.push({
                  id: chunks.length,
                  text: chunkWithContext,
                  type: 'section',
                  title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
                });
                
                contentPos = chunkEnd - chunkOverlap;
                if (contentPos <= 0 || contentPos >= contentText.length) break;
              }
            }
            
            currentChunk = "";
          } else {
            const headerContext = currentHeaders.map(h => h.text).join('\n');
            currentChunk = (headerContext.length > 0 ? headerContext + '\n\n' : "") + contentText;
          }
        } else {
          currentChunk += (currentChunk.length > 0 && !currentChunk.endsWith('\n\n') ? '\n\n' : '') + contentText;
        }
      }
    });
    
    if (currentChunk.length > 0) {
      chunks.push({
        id: chunks.length,
        text: currentChunk,
        type: 'section',
        title: topLevelHeader ? topLevelHeader.replace(/\n/g, ' ').trim() : null
      });
    }
  } else {
    const paragraphs = content.split(/\n\s*\n/);
    
    let currentChunk = "";
    paragraphs.forEach((para) => {
      if (para.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push({
            id: chunks.length,
            text: currentChunk,
            type: 'paragraph'
          });
          currentChunk = "";
        }
        
        let paraPos = 0;
        while (paraPos < para.length) {
          const chunkSize = Math.min(idealChunkSize, para.length - paraPos);
          chunks.push({
            id: chunks.length,
            text: para.substring(paraPos, paraPos + chunkSize),
            type: 'paragraph'
          });
          
          paraPos += chunkSize - chunkOverlap;
          if (paraPos <= 0 || paraPos >= para.length) break;
        }
      } 
      else if (currentChunk.length + para.length + 2 > idealChunkSize && currentChunk.length > minChunkSize) {
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
  

  console.log(`Document chunking stats:
  - Original size: ${(contentLength / 1024).toFixed(2)} KB
  - Chunks created: ${chunks.length}
  - Average chunk size: ${(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length).toFixed(2)} characters
  - Target chunk size: ${idealChunkSize} characters`);
  
  return chunks;
};

module.exports = {
  chunkDocument
};