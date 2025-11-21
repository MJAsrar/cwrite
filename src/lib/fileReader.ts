/**
 * File Reader Utility
 * Reads text from various file types including PDF
 */

export interface FileContent {
  text: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * Read text content from a PDF file
 */
async function readPDF(file: File): Promise<string> {
  // Dynamic import to avoid SSR issues
  if (typeof window === 'undefined') {
    throw new Error('PDF reading is only available in the browser');
  }

  try {
    // @ts-ignore - Dynamic import
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set up worker (only once)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw new Error('Failed to read PDF file. Please ensure it is a valid PDF.');
  }
}

/**
 * Read text content from a plain text file
 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read text file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Read file content based on file type
 */
export async function readFileContent(file: File): Promise<FileContent> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let text: string;
  
  try {
    if (extension === 'pdf' || file.type === 'application/pdf') {
      text = await readPDF(file);
    } else if (
      extension === 'txt' || 
      extension === 'md' || 
      extension === 'markdown' ||
      file.type.startsWith('text/')
    ) {
      text = await readTextFile(file);
    } else {
      // Try to read as text anyway
      text = await readTextFile(file);
    }
    
    return {
      text,
      filename: file.name,
      size: file.size,
      type: file.type || 'text/plain'
    };
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

/**
 * Read multiple files
 */
export async function readMultipleFiles(files: File[]): Promise<FileContent[]> {
  const promises = files.map(file => readFileContent(file));
  return Promise.all(promises);
}

/**
 * Validate file before reading
 */
export function validateFile(file: File, options?: {
  maxSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 50 * 1024 * 1024; // 50MB default
  const allowedTypes = options?.allowedTypes || ['.txt', '.pdf', '.md'];
  
  // Check size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`
    };
  }
  
  // Check type
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(extension)) {
    return {
      valid: false,
      error: `File type not supported. Allowed: ${allowedTypes.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Download text content as a file
 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

