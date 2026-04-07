import React from 'react';
import { Download, Eye, CheckCircle2, Clock, FileEdit } from 'lucide-react';
import './DocumentCard.css';

const statusConfig = {
  ready: {
    label: 'PRET',
    icon: CheckCircle2,
    className: 'status-ready',
  },
  draft: {
    label: 'BROUILLON',
    icon: FileEdit,
    className: 'status-draft',
  },
  pending: {
    label: 'EN ATTENTE',
    icon: Clock,
    className: 'status-pending',
  },
};

const DocumentCard = ({
  title,
  description,
  status,
  icon,
  canExport,
  loading,
  onPreview,
  onExport,
}) => {
  const statusInfo = statusConfig[status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="document-card">
      <div className="document-card-top">
        <div className="document-card-icon">{icon}</div>
      </div>

      <h3 className="document-card-title">{title}</h3>
      <p className="document-card-description">{description}</p>

      <div className={`document-card-status ${statusInfo.className}`}>
        <StatusIcon size={14} />
        <span>{statusInfo.label}</span>
      </div>

      <div className="document-card-actions">
        <button type="button" className="secondary" onClick={onPreview}>
          <Eye size={16} />
          Preview
        </button>
        <button
          type="button"
          className="primary"
          onClick={onExport}
          disabled={!canExport || loading}
        >
          <Download size={16} />
          {loading ? 'Generation...' : 'Exporter'}
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;
