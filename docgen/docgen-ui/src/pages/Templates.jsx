import React, { useState, useEffect } from 'react';
import TemplateCard from '../components/templates/TemplateCard';
import { getAllTemplates } from '../services/templateService';
import './Templates.css';

/**
 * Templates Page - Template Configuration Back-Office
 * Displays all available template configurations in a grid layout
 */
const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates. Please ensure the Nest backend is running on http://localhost:3000');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template) => {
    console.log('Template clicked:', template);
    // TODO: Navigate to template detail/edit page
    // For now, just log to console
  };

  const handleCreateNew = () => {
    console.log('Create new template clicked');
    // TODO: Navigate to template creation page
  };

  // Loading state
  if (loading) {
    return (
      <div className="templates-page">
        <div className="templates-header">
          <h1 className="templates-title">Template Configuration Back-Office</h1>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="templates-page">
        <div className="templates-header">
          <h1 className="templates-title">Template Configuration Back-Office</h1>
        </div>
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Templates</h3>
          <p>{error}</p>
          <button onClick={fetchTemplates} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="templates-page">
        <div className="templates-header">
          <h1 className="templates-title">Template Configuration Back-Office</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No Templates Found</h3>
          <p>Get started by creating your first template</p>
          <button onClick={handleCreateNew} className="create-button">
            ➕ Create First Template
          </button>
        </div>
      </div>
    );
  }

  // Main content with templates
  return (
    <div className="templates-page">
      <div className="templates-header">
        <h1 className="templates-title">Template Configuration Back-Office</h1>
        <button onClick={handleCreateNew} className="create-button-header">
          ➕ Create New Template
        </button>
      </div>

      <div className="templates-grid">
        {templates.map((template) => (
          <TemplateCard
            key={template.name}
            template={template}
            onClick={handleTemplateClick}
          />
        ))}
      </div>
    </div>
  );
};

export default Templates;
