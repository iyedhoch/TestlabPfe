import React, { useMemo, useState } from 'react';
import {
	Search,
	Download,
	ClipboardCheck,
	FileText,
	BookOpen,
	BarChart3,
} from 'lucide-react';
import DocumentCard from '../components/documents/DocumentCard';
import { exportCahierRecette, exportFSD } from '../services/api';
import './dashboard.css';

const documents = [
	{
		id: 'cahier',
		title: 'Cahier de recette',
		description:
			'Document de validation fonctionnelle et scenarios de test complets pour votre projet.',
		status: 'ready',
		icon: <ClipboardCheck size={24} />,
		canExport: true,
	},
	{
		id: 'fsd',
		title: 'Specification fonctionnelle',
		description:
			'Description detaillee des besoins fonctionnels et des regles metier du systeme.',
		status: 'ready',
		icon: <FileText size={24} />,
		canExport: true,
	},
	{
		id: 'manual',
		title: "Manuel d'utilisation",
		description:
			"Guide utilisateur avec procedures detaillees et captures d'ecran.",
		status: 'draft',
		icon: <BookOpen size={24} />,
		canExport: false,
	},
	{
		id: 'report',
		title: "Rapport d'execution",
		description:
			'Synthese des executions, statuts des tests et anomalies detectees.',
		status: 'pending',
		icon: <BarChart3 size={24} />,
		canExport: false,
	},
];

const DashboardPage = () => {
	const [query, setQuery] = useState('');
	const [loadingById, setLoadingById] = useState({});
	const [errorMessage, setErrorMessage] = useState('');

	const filteredDocuments = useMemo(() => {
		const lowerQuery = query.trim().toLowerCase();
		if (!lowerQuery) {
			return documents;
		}

		return documents.filter((doc) => {
			return (
				doc.title.toLowerCase().includes(lowerQuery) ||
				doc.description.toLowerCase().includes(lowerQuery)
			);
		});
	}, [query]);

	const setLoading = (docId, value) => {
		setLoadingById((current) => ({
			...current,
			[docId]: value,
		}));
	};

	const handleExport = async (documentId) => {
		setErrorMessage('');
		setLoading(documentId, true);

		try {
			const defaultProjectId = 1;
			if (documentId === 'fsd') {
				await exportFSD(defaultProjectId, { format: 'pdf' });
			}
			if (documentId === 'cahier') {
				await exportCahierRecette(defaultProjectId, { format: 'pdf' });
			}
		} catch (error) {
			console.error('Export failed:', error);
			setErrorMessage(error.message || 'Erreur lors de la generation du document.');
		} finally {
			setLoading(documentId, false);
		}
	};

	const handleExportAll = async () => {
		await handleExport('cahier');
		await handleExport('fsd');
	};

	return (
		<div className="dashboard-page">
			<div className="dashboard-hero">
				<h1>Gestionnaire de Documents</h1>
				<p>
					Gere, genere et exporte tes livrables documentaires directement depuis
					DocGen.
				</p>
			</div>

			<div className="dashboard-toolbar">
				<div className="search-box">
					<Search size={16} />
					<input
						type="text"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Rechercher un document..."
					/>
				</div>

				<button type="button" className="export-all-btn" onClick={handleExportAll}>
					<Download size={16} />
					Exporter Cahier + FSD
				</button>
			</div>

			{errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

			<section>
				<h2 className="dashboard-section-title">Types de documents</h2>
				<div className="dashboard-grid">
					{filteredDocuments.map((doc) => (
						<DocumentCard
							key={doc.id}
							title={doc.title}
							description={doc.description}
							status={doc.status}
							icon={doc.icon}
							canExport={doc.canExport}
							loading={Boolean(loadingById[doc.id])}
							onPreview={() => console.log('Preview requested for', doc.id)}
							onExport={() => handleExport(doc.id)}
						/>
					))}
				</div>
			</section>
		</div>
	);
};

export default DashboardPage;
