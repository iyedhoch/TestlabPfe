import React from 'react';
import './TemplateCard.css';

/**
 * TemplateCard Component
 * Displays a single template configuration card with name, description, and active status
 * 
 * @param {Object} template - Template configuration object
 * @param {Function} onClick - Click handler for card interaction
 */
const TemplateCard = ({ template, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(template);
    } else {
      console.log('Template clicked:', template.name);
    }
  };

  return (
    <div 
      className={`template-card ${template.active ? 'template-card--active' : ''}`}
      onClick={handleClick}
    >
      <div className="template-card__icon">📄</div>
      
      <div className="template-card__content">
        <h3 className="template-card__title">{template.name}</h3>
        
        {template.description && (
          <p className="template-card__description">{template.description}</p>
        )}
        
        <div className="template-card__status">
          <span className={`status-indicator ${template.active ? 'status-indicator--active' : ''}`}>
            {template.active ? '●' : '○'}
          </span>
          <span className="status-text">
            {template.active ? 'ACTIVE' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
