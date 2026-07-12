import { VectorStore } from '@langchain/core/vectorstores';

// ==========================================
// 1. COSINE SIMILARITY HELPER
// ==========================================
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// ==========================================
// 2. WORD-SAFE TEXT CHUNKER (~500 chars)
// ==========================================
/**
 * Splits input text into blocks of roughly `chunkSize` characters
 * @param {string} text - The input text content
 * @param {number} chunkSize - Targeted chunk character count
 * @returns {string[]} Array of text chunks
 */
export const chunkText = (text, chunkSize = 500) => {
  if (!text) return [];
  
  // Normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let currentIdx = 0;
  
  while (currentIdx < cleanText.length) {
    if (currentIdx + chunkSize >= cleanText.length) {
      chunks.push(cleanText.slice(currentIdx));
      break;
    }
    
    let splitIdx = currentIdx + chunkSize;
    // Look back up to 60 characters to find a word boundary (space)
    const lookbackLimit = Math.max(currentIdx, splitIdx - 60);
    let foundBoundary = false;
    
    for (let i = splitIdx; i >= lookbackLimit; i--) {
      if (cleanText[i] === ' ') {
        splitIdx = i;
        foundBoundary = true;
        break;
      }
    }
    
    chunks.push(cleanText.slice(currentIdx, splitIdx).trim());
    currentIdx = foundBoundary ? splitIdx + 1 : splitIdx;
  }
  
  return chunks.filter(c => c.length > 5); // Exclude tiny chunks
};

// ==========================================
// 3. CUSTOM LANGCHAIN VECTORSTORE SUBCLASS
// ==========================================
export class MemoryVectorStore extends VectorStore {
  _vectorstoreType() {
    return 'memory';
  }

  constructor(embeddings, fields = {}) {
    super(embeddings, fields);
    this.vectors = []; // Stores objects of shape: { embedding, pageContent, metadata }
  }

  /**
   * Adds pre-computed document embeddings to the store
   * @param {number[][]} vectors - Nested array of embeddings
   * @param {Document[]} documents - Array of LangChain Document instances
   */
  async addVectors(vectors, documents) {
    for (let i = 0; i < vectors.length; i++) {
      this.vectors.push({
        embedding: vectors[i],
        pageContent: documents[i].pageContent,
        metadata: documents[i].metadata || {}
      });
    }
  }

  async addDocuments(documents) {
    const texts = documents.map(doc => doc.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);
    await this.addVectors(vectors, documents);
    console.log("Vector store created");
    console.log("Documents:", documents.length);
    console.log("Embeddings stored successfully");
  }

  /**
   * Performs exact linear search (cosine similarity) over all vectors
   * @param {number[]} query - Query embedding vector
   * @param {number} k - Top results limit
   * @returns {Promise<Array>} Nested array [[Document, score], ...]
   */
  async similaritySearchVectorWithScore(query, k) {
    const results = [];
    
    for (const vector of this.vectors) {
      const score = cosineSimilarity(query, vector.embedding);
      results.push([
        {
          pageContent: vector.pageContent,
          metadata: vector.metadata
        },
        score
      ]);
    }
    
    // Sort descending by score
    results.sort((a, b) => b[1] - a[1]);
    return results.slice(0, k);
  }

  /**
   * Static helper to create a vector store from text array directly
   */
  static async fromTexts(texts, metadatas, embeddings, options) {
    const store = new MemoryVectorStore(embeddings, options);
    const docs = texts.map((text, idx) => ({
      pageContent: text,
      metadata: Array.isArray(metadatas) ? metadatas[idx] : metadatas || {}
    }));
    await store.addDocuments(docs);
    return store;
  }
}
