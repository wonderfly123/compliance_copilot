import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Copilot from '../components/copilot/Copilot';

const ReferenceDocuments = () => {
  const [referenceDocuments, setReferenceDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [referenceType, setReferenceType] = useState('All Types');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [referenceForm, setReferenceForm] = useState({
    title: '',
    description: '',
    type: 'Federal Guide',
    tags: [],
    sourceOrg: '',
    authorityLevel: 'guideline'
  });
  const fileInputRef = useRef(null);

  // Fetch reference documents from the API
  useEffect(() => {
    const fetchReferenceDocuments = async () => {
      try {
        setLoading(true);
        // Get references from API
        const response = await axios.get('/api/references');
        if (response.data.data && response.data.data.length > 0) {
          setReferenceDocuments(response.data.data);
        } else {
          // Empty array returned - no documents yet
          console.log('No reference documents found');
          // Just set empty array, we'll handle this in the UI
          setReferenceDocuments([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reference documents:', error);
        // Don't show error for 404 when no reference documents exist yet
        if (error.response && error.response.status === 404) {
          console.log('No reference documents found - 404 response');
          setReferenceDocuments([]);
        } else {
          setError('There was an error connecting to the server. Using demo mode.');
        }
        setLoading(false);
        
        // Always use mock data if API fails
        console.log('Using mock data for development/demo mode');
        setReferenceDocuments([
          { id: 1, title: 'FEMA CPG 101', uploadDate: '2025-03-15', status: 'Active', type: 'Federal Guide' },
          { id: 2, title: 'NIMS 2025 Edition', uploadDate: '2025-02-28', status: 'Active', type: 'Federal Doc' },
          { id: 3, title: 'Cal OES Planning Guide', uploadDate: '2025-03-10', status: 'Active', type: 'State Guide' },
          { id: 4, title: 'FEMA ESF 8 Guidance', uploadDate: '2024-12-05', status: 'Active', type: 'Federal Guide' },
          { id: 5, title: 'Wildfire Planning Technical Guide', uploadDate: '2025-02-12', status: 'Active', type: 'Technical Guide' }
        ]);
      }
    };

    fetchReferenceDocuments();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReferenceForm({ ...referenceForm, [name]: value });
  };
  
  // Handle file upload
  const handleUploadReference = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const file = fileInputRef.current.files[0];
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!referenceForm.title) {
      setError('Please enter a reference document title');
      return;
    }
    
    try {
      setUploadLoading(true);
      
      // Append form data
      formData.append('file', file);
      formData.append('title', referenceForm.title);
      formData.append('description', referenceForm.description);
      formData.append('type', referenceForm.type);
      formData.append('sourceOrg', referenceForm.sourceOrg);
      formData.append('authorityLevel', referenceForm.authorityLevel);
      formData.append('tags', JSON.stringify(referenceForm.tags));
      
      // Make API request
      const response = await axios.post('/api/references/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Close modal and refresh reference list
      setUploadModalOpen(false);
      setUploadLoading(false);
      
      // Reset form
      setReferenceForm({
        title: '',
        description: '',
        type: 'Federal Guide',
        tags: [],
        sourceOrg: '',
        authorityLevel: 'guideline'
      });
      
      // Fetch reference documents again to update the list
      const fetchReferenceDocumentsAgain = async () => {
        try {
          setLoading(true);
          const response = await axios.get('/api/references');
          setReferenceDocuments(response.data.data);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching reference documents:', error);
          setLoading(false);
        }
      };
      fetchReferenceDocumentsAgain();
      
    } catch (error) {
      console.error('Error uploading reference document:', error);
      setUploadLoading(false);
      setError(error.response?.data?.message || 'Failed to upload reference document. Please try again.');
    }
  };

  // Handle viewing a reference document
  const handleViewReference = async (id) => {
    try {
      setViewLoading(true);
      
      // Fetch the document from the API
      const response = await axios.get(`/api/references/${id}`);
      
      if (response.data.success) {
        setCurrentDocument(response.data.data);
        setViewModalOpen(true);
      } else {
        setError('Failed to retrieve reference document');
      }
    } catch (error) {
      console.error('Error fetching reference document:', error);
      setError(error.response?.data?.message || 'Failed to retrieve reference document');
    } finally {
      setViewLoading(false);
    }
  };

  // Handle deleting a reference document
  const handleDeleteReference = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      
      // Call the API to delete the reference document
      const response = await axios.delete(`/api/references/${deleteId}`);
      
      if (response.data.success) {
        // Remove the document from the state
        setReferenceDocuments(referenceDocuments.filter(doc => doc.id !== deleteId));
        setDeleteModalOpen(false);
      } else {
        setError('Failed to delete reference document');
      }
    } catch (error) {
      console.error('Error deleting reference document:', error);
      setError(error.response?.data?.message || 'Failed to delete reference document');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter reference documents based on search term and type
  const filteredReferenceDocuments = referenceDocuments.filter(doc => {
    const matchesSearchTerm = 
      doc?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesReferenceType = 
      referenceType === 'All Types' || doc?.type === referenceType;
    return matchesSearchTerm && matchesReferenceType;
  });

  if (loading) {
    return <div className="content-area">Loading reference documents...</div>;
  }

  if (error && error !== 'Upload your first reference document') {
    return <div className="content-area text-red-600">{error}</div>;
  }

  return (
    <div className="content-area">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reference Document Library</h2>
        <button 
          className="btn flex items-center"
          onClick={() => setUploadModalOpen(true)}
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Upload Reference Document
        </button>
      </div>
      
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <h3 className="text-lg font-medium">Reference Documents</h3>
            <span className="ml-2 bg-gray-100 text-gray-700 py-1 px-2 text-xs">{filteredReferenceDocuments.length}</span>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search reference documents..." 
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
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
            >
              <option>All Types</option>
              <option>Federal Guide</option>
              <option>Federal Doc</option>
              <option>State Guide</option>
              <option>Technical Guide</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredReferenceDocuments.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Reference Title</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferenceDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium">{doc.title}</td>
                    <td>{doc.type}</td>
                    <td>{doc.uploadDate}</td>
                    <td>
                      <span className={`reference-type ${
                        doc.type === 'Federal Guide' ? 'type-federal' : 
                        doc.type === 'State Guide' ? 'type-state' : 
                        'type-technical'
                      }`}>
                        {doc.type}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => handleViewReference(doc.id)}
                      >View</button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteReference(doc.id)}
                      >
                        Delete
                      </button>
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
              <h3 className="mt-2 text-lg font-medium">{referenceDocuments.length === 0 ? "Get started by uploading your first reference document" : "No reference documents found"}</h3>
              <p className="mt-1 text-sm">{referenceDocuments.length === 0 ? "Upload standards and guides to check your plans against for compliance" : "Try changing your search or filter criteria, or upload a new reference document."}</p>
              <div className="mt-6">
                <button 
                  className="btn flex items-center mx-auto"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload a reference document
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* View Document Modal */}
      {viewModalOpen && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setViewModalOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold mb-4">{currentDocument.title}</h2>
            
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 font-medium">Type:</span> {currentDocument.doc_subtype || currentDocument.type}
              </div>
              <div>
                <span className="text-gray-600 font-medium">Source:</span> {currentDocument.source_org || 'N/A'}
              </div>
              <div>
                <span className="text-gray-600 font-medium">Uploaded:</span> {currentDocument.created_at ? new Date(currentDocument.created_at).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <span className="text-gray-600 font-medium">Authority level:</span> {currentDocument.authority_level || 'N/A'}
              </div>
            </div>
            
            {currentDocument.description && (
              <div className="mb-4">
                <h3 className="text-md font-medium mb-2">Description:</h3>
                <p className="text-gray-700">{currentDocument.description}</p>
              </div>
            )}
            
            <div className="border-t pt-4 mt-4">
              <h3 className="text-md font-medium mb-2">Document Content:</h3>
              <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                {currentDocument.content ? (
                  <pre className="whitespace-pre-wrap">{currentDocument.content}</pre>
                ) : (
                  <div className="text-gray-500 italic">No content available for preview. Please download the document to view contents.</div>
                )}
              </div>
            </div>
            
            {currentDocument.file_url && (
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={async () => {
                    try {
                      if (currentDocument.file_url) {
                        // Direct download from Supabase with file path
                        const supabaseUrl = 'https://ehazvybmhkfrmoyukiqy.supabase.co';
                        const downloadUrl = `${supabaseUrl}/storage/v1/object/public/reference-documents/${currentDocument.file_url}`;
                        console.log('Direct Supabase URL:', downloadUrl);
                        
                        // Create a temporary link to download the file
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        const filename = currentDocument.original_filename || `${currentDocument.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                        link.setAttribute('download', filename);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else {
                        setError('No file available for download');
                      }
                    } catch (error) {
                      console.error('Error downloading document:', error);
                      setError('Failed to download document');
                    }
                  }}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Download Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setDeleteModalOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold mb-4">Delete Reference Document</h2>
            
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this reference document? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button 
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copilot component */}
      <Copilot />
      
      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
            <button 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setUploadModalOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-semibold mb-4">Upload Reference Document</h2>
            
            <form onSubmit={handleUploadReference}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                  <input 
                    type="text" 
                    name="title"
                    value={referenceForm.title}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                  <select 
                    name="type"
                    value={referenceForm.type}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  >
                    <option value="Federal Guide">Federal Guide</option>
                    <option value="Federal Doc">Federal Document</option>
                    <option value="State Guide">State Guide</option>
                    <option value="Technical Guide">Technical Guide</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Organization</label>
                  <input 
                    type="text" 
                    name="sourceOrg"
                    value={referenceForm.sourceOrg}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authority Level</label>
                  <select 
                    name="authorityLevel"
                    value={referenceForm.authorityLevel}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  >
                    <option value="guideline">Guideline</option>
                    <option value="requirement">Requirement</option>
                    <option value="regulation">Regulation</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    name="description"
                    value={referenceForm.description}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="form-input w-full"
                    accept=".pdf,.doc,.docx,.txt,.md,.json"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, Word, Text, Markdown, JSON (Max 20MB)
                  </p>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button 
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                  onClick={() => setUploadModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceDocuments;