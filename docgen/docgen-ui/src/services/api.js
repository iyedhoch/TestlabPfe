import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const resolveUserId = () => {
  if (typeof window === 'undefined') {
    return '1';
  }
  return localStorage.getItem('userId') || '1';
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': '1',
  },
});

apiClient.interceptors.request.use((config) => {
  const userId = resolveUserId();
  config.headers = config.headers || {};
  config.headers['x-user-id'] = userId;
  // Temporary debug trace for auth header troubleshooting.
  console.log('Sending request with x-user-id:', userId);
  return config;
});

const getErrorMessage = (error, fallbackMessage) => {
  return error?.response?.data?.message || error?.message || fallbackMessage;
};

const extractFileName = (headers, fallbackFileName) => {
  const disposition = headers?.['content-disposition'];
  if (!disposition) {
    return fallbackFileName;
  }

  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = disposition.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallbackFileName;
};

export const downloadBlob = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const getProjectDocuments = async () => {
  try {
    const response = await apiClient.get('/api/project-documents');
    return response.data;
  } catch (error) {
    console.error('Error fetching project documents:', error);
    throw error;
  }
};

export const getProjectDocumentById = async (id) => {
  try {
    const response = await apiClient.get(`/api/project-documents/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching project document ${id}:`, error);
    throw error;
  }
};

export const generateDocument = async (
  id,
  format,
  { template, mode, type } = {},
) => {
  try {
    const params = {};
    if (template) {
      params.template = template;
    }
    if (mode) {
      params.mode = mode;
    }
    if (type) {
      params.type = type;
    }

    const config = {
      responseType: format === 'html' ? 'text' : 'blob',
      params,
    };

    const response = await apiClient.get(
      `/api/project-documents/${id}/document/${format}`,
      config
    );

    return response;
  } catch (error) {
    console.error(
      `Error generating ${format} document for project ${id}:`,
      error,
    );
    throw error;
  }
};

const exportDocumentByType = async (projectId, documentType, options = {}) => {
  const format = options.format || 'pdf';
  const fallbackFileName =
    documentType === 'fsd'
      ? format === 'word'
        ? 'functional-specification-document.docx'
        : 'functional-specification-document.pdf'
      : format === 'word'
        ? 'cahier-recette.docx'
        : 'cahier-recette.pdf';

  try {
    const response = await generateDocument(projectId, format, {
      template: options.template,
      mode: options.mode,
      type: documentType,
    });
    const fileName = extractFileName(response.headers, fallbackFileName);
    downloadBlob(response.data, fileName);
    return { ok: true, fileName };
  } catch (error) {
    const message = getErrorMessage(
      error,
      'Document generation failed. Please try again.',
    );
    throw new Error(message);
  }
};

export const exportFSD = async (projectId, options = {}) => {
  return exportDocumentByType(projectId, 'fsd', options);
};

export const exportCahierRecette = async (projectId, options = {}) => {
  return exportDocumentByType(projectId, 'cahier', options);
};

export default apiClient;
