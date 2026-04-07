import apiClient from './api';

/**
 * Get the currently active template configuration
 * @returns {Promise} - Active template configuration
 */
export const getActiveTemplate = async () => {
  try {
    const response = await apiClient.get('/api/templates/active');
    return response.data;
  } catch (error) {
    console.error('Error fetching active template:', error);
    throw error;
  }
};

/**
 * Get all available templates
 * @returns {Promise} - Array of all template configurations
 */
export const getAllTemplates = async () => {
  try {
    const response = await apiClient.get('/api/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching all templates:', error);
    throw error;
  }
};

/**
 * Save/update template configuration
 * @param {Object} config - Template configuration object
 * @returns {Promise} - Saved configuration
 */
export const saveTemplateConfig = async (config) => {
  try {
    const templateId = config?.id;
    if (!templateId) {
      throw new Error('Template id is required to activate a template');
    }
    const response = await apiClient.post(`/api/templates/${templateId}/activate`);
    return response.data;
  } catch (error) {
    console.error('Error saving template config:', error);
    throw error;
  }
};
