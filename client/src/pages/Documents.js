import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Copilot from '../components/copilot/Copilot';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentType, setDocumentType] = useState('All Types');

  // Fetch documents from the API
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        // In production, this will be replaced with actual API call
        // const response = await axios.get('/api/documents');
        // setDocuments(response.data.data);
        
        // Temporary data for development
        setDocuments([
          { id: 1, title: 'Marin County EOP 2025', uploadDate: '2025-03-15', status: 'In Review', type: 'EOP' },
          { id: 2, title: 'City of Oakland Hazard Mitigation Plan', uploadDate: '2025-02-28', status: 'Draft', type: 'HMP' },
          { id: 3, title: 'Bay Area Regional Emergency Communications Plan', uploadDate: '2025-03-10', status: 'Final', type: 'Regional Plan' },
          { id: 4, title: 'San Mateo County Evacuation Plan', uploadDate: '2024-12-05', status: 'Needs Review', type: 'EOP' },
          { id: 5, title: 'Berkeley Wildfire Preparedness Plan', uploadDate: '2025-02-12', status: 'In Review', type: 'HMP' }
        ]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError('Failed to load documents. Please try again.');
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Filter documents based on search term and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearchTerm = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDocumentType = documentType === 'All Types' || doc.type === documentType;
    return matchesSearchTerm && matchesDocumentType;
  });

  if (loading) {
    return <div className="content-area">Loading documents...</div>;
  }

  if (error) {
    return <div className="content-area text-red-600">{error}</div>;
  }

  return (
    <div className="content-area">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Document Library</h2>
        <button 
          className="btn flex items-center"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Upload Document
        </button>
      </div>
      
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <h3 className="text-lg font-medium">My Documents</h3>
            <span className="ml-2 bg-gray-100 text-gray-700 py-1 px-2 text-xs">{filteredDocuments.length}</span>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search documents..." 
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <div className="absolute left-3 top-2.5">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <select 
              className="form-input"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option>All Types</option>
              <option>EOP</option>
              <option>HMP</option>
              <option>COOP</option>
              <option>Regional Plan</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredDocuments.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium">{doc.title}</td>
                    <td>{doc.type}</td>
                    <td>{doc.uploadDate}</td>
                    <td>
                      <span className={`plan-status ${
                        doc.status === 'Final' ? 'status-final' : 
                        doc.status === 'In Review' ? 'status-review' : 
                        doc.status === 'Needs Review' ? 'status-needs-review' :
                        'status-draft'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td>
                      <button className="text-blue-600 hover:text-blue-900 mr-2">View</button>
                      <button className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                      <button className="text-blue-600 hover:text-blue-900">Analyze</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium">No documents found</h3>
              <p className="mt-1 text-sm">Try changing your search or filter criteria, or upload a new document.</p>
              <div className="mt-6">
                <button 
                  className="btn flex items-center mx-auto"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload a document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Copilot component */}
      <Copilot />
    </div>
  );
};

export default Documents;
