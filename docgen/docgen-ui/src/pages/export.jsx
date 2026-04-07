import React, { useState } from 'react';
import { FileDown, LoaderCircle } from 'lucide-react';
import { exportCahierRecette, exportFSD } from '../services/api';
import './export.css';

const ExportPage = () => {
	const [projectId, setProjectId] = useState('1');
	const [loadingKey, setLoadingKey] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const runExport = async (key) => {
		setErrorMessage('');
		setLoadingKey(key);

		try {
			const parsedId = Number(projectId);
			if (!Number.isInteger(parsedId) || parsedId <= 0) {
				throw new Error('Project ID must be a positive number.');
			}

			if (key === 'cahier') {
				await exportCahierRecette(parsedId, { format: 'pdf' });
			}
			if (key === 'fsd') {
				await exportFSD(parsedId, { format: 'pdf' });
			}
		} catch (error) {
			console.error('Export error:', error);
			setErrorMessage(error.message || 'Export failed.');
		} finally {
			setLoadingKey('');
		}
	};

	return (
		<div className="export-page">
			<h1>Export Documents</h1>
			<p>
				Selectionne un projet et genere les livrables directement depuis le
				backend NestJS.
			</p>

			<label htmlFor="project-id" className="field-label">
				Project ID
			</label>
			<input
				id="project-id"
				type="number"
				min="1"
				value={projectId}
				onChange={(event) => setProjectId(event.target.value)}
			/>

			<div className="export-actions">
				<button
					type="button"
					onClick={() => runExport('cahier')}
					disabled={loadingKey.length > 0}
				>
					{loadingKey === 'cahier' ? (
						<LoaderCircle size={16} className="spin" />
					) : (
						<FileDown size={16} />
					)}
					Export Cahier de Recette (PDF)
				</button>

				<button
					type="button"
					onClick={() => runExport('fsd')}
					disabled={loadingKey.length > 0}
				>
					{loadingKey === 'fsd' ? (
						<LoaderCircle size={16} className="spin" />
					) : (
						<FileDown size={16} />
					)}
					Export Specification Fonctionnelle (PDF)
				</button>
			</div>

			{errorMessage ? <p className="error-box">{errorMessage}</p> : null}
		</div>
	);
};

export default ExportPage;
