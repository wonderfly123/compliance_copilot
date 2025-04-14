// client/src/pages/Plans.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Copilot from '../components/copilot/Copilot';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    type: 'EOP',
    status: 'Draft',
    location: '',
    department: '',
    tags: []
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  // Fetch plans data
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // Get plans from API
        const response = await axios.get('/api/plans');
        if (response.data.data && response.data.data.length > 0) {
          setPlans(response.data.data);
        } else {
          // Empty array returned - no plans yet
          console.log('No plans found');
          // Just set empty array, we'll handle this in the UI
          setPlans([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching plans:', error);
        
        // Don't show error for 404 when no plans exist yet
        if (error.response && error.response.status === 404) {
          console.log('No plans found - 404 response');
          setPlans([]);
        } else {
          setError('There was an error connecting to the server. Using demo mode.');
        }
        setLoading(false);
        
        // Always use mock data if API fails 
        console.log('Using mock data for development/demo mode');
        setPlans([
          { 
            id: "1", 
            title: "San Mateo County EOP", 
            type: "EOP", 
            status: "Final", 
            compliance_score: 78, 
            last_analyzed: "2025-03-01T15:30:00Z",
            expiration_date: "2025-09-15T00:00:00Z",
            location: "San Mateo County"
          },
          { 
            id: "2", 
            title: "San Mateo Evacuation Plan", 
            type: "EOP", 
            status: "Draft", 
            compliance_score: 42, 
            last_analyzed: "2025-03-28T09:45:00Z",
            expiration_date: "2025-08-22T00:00:00Z",
            location: "San Mateo County"
          },
          { 
            id: "3", 
            title: "Health Department COOP", 
            type: "COOP", 
            status: "In Review", 
            compliance_score: 61, 
            last_analyzed: "2025-02-15T11:20:00Z",
            expiration_date: "2025-12-30T00:00:00Z",
            location: "County Health Department"
          },
          { 
            id: "4", 
            title: "Wildfire Hazard Mitigation Plan", 
            type: "HMP", 
            status: "Final", 
            compliance_score: 89, 
            last_analyzed: "2025-01-30T14:15:00Z",
            expiration_date: "2026-01-30T00:00:00Z",
            location: "County Fire Authority"
          },
          { 
            id: "5", 
            title: "Pandemic Response Plan", 
            type: "EOP", 
            status: "Final", 
            compliance_score: 76, 
            last_analyzed: "2025-02-22T10:40:00Z",
            expiration_date: "2025-10-15T00:00:00Z",
            location: "County Health Department"
          }
        ]);
      }
    };

    fetchPlans();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlanForm({ ...planForm, [name]: value });
  };
  
  // Handle file upload
  const handleUploadPlan = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const file = fileInputRef.current.files[0];
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!planForm.title) {
      setError('Please enter a plan title');
      return;
    }
    
    try {
      setUploadLoading(true);
      
      // Append form data
      formData.append('file', file);
      formData.append('title', planForm.title);
      formData.append('description', planForm.description);
      formData.append('type', planForm.type);
      formData.append('status', planForm.status);
      formData.append('location', planForm.location);
      formData.append('department', planForm.department);
      formData.append('tags', JSON.stringify(planForm.tags));
      
      // Make API request
      const response = await axios.post('/api/plans/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Close modal and refresh plans
      setUploadModalOpen(false);
      setUploadLoading(false);
      
      // Reset form
      setPlanForm({
        title: '',
        description: '',
        type: 'EOP',
        status: 'Draft',
        location: '',
        department: '',
        tags: []
      });
      
      // Fetch plans again to update the list
      const fetchPlansAgain = async () => {
        try {
          setLoading(true);
          const response = await axios.get('/api/plans');
          setPlans(response.data.data);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching plans:', error);
          setLoading(false);
        }
      };
      fetchPlansAgain();
      
    } catch (error) {
      console.error('Error uploading plan:', error);
      setUploadLoading(false);
      setError(error.response?.data?.message || 'Failed to upload plan. Please try again.');
    }
  };
  
  // Filter plans based on search term, type, and status
  const filteredPlans = plans.filter(plan => {
    const matchesSearchTerm = 
      (plan.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (plan.location?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesPlanType = planTypeFilter === 'All Types' || plan.type === planTypeFilter;
    const matchesStatus = statusFilter === 'All Statuses' || plan.status === statusFilter;
    return matchesSearchTerm && matchesPlanType && matchesStatus;
  });
  
  // Handle plan analysis request
  const handleAnalyzePlan = async (planId) => {
    try {
      // Show loading state
      setLoading(true);
      
      // First, try to perform a new analysis
      console.log('Initiating analysis for plan:', planId);
      
      const response = await axios.post('/api/ai/analyze', {
        planId
      });
      
      if (response.data.success) {
        console.log('Analysis completed successfully');
        // After successful analysis, navigate to results page
        navigate(`/gap-analysis-results/${planId}`);
      } else {
        console.error('Analysis failed:', response.data.message);
        setError(response.data.message || 'Analysis failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error analyzing plan:', error);
      setError(error.response?.data?.message || 'Failed to analyze plan. Please try again.');
      setLoading(false);
    }
  };
  
  // Get color class for compliance score
  const getScoreColorClass = (score) => {
    if (score >= 71) return 'bg-green-100 text-green-800';
    if (score >= 41) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  if (loading) {
    return <div className="content-area">Loading plans...</div>;
  }
  
  if (error && error !== 'Upload your first Plan') {
    return <div className="content-area text-red-600">{error}</div>;
  }
  
  return (
    <div className="content-area">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Emergency Plans</h2>
        <button 
          className="btn flex items-center"
          onClick={() => setUploadModalOpen(true)}
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Upload New Plan
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Compliance Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Compliance Summary</h3>
          <div className="flex items-center mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-500">Average Compliance</div>
              <div className="text-2xl font-bold">
                {Math.round(
                  plans.reduce((sum, plan) => sum + plan.compliance_score, 0) / plans.length
                )}%
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-md p-3">
              <div className="text-sm text-gray-600">Plans Needing Review</div>
              <div className="text-xl font-semibold">
                {plans.filter(plan => plan.compliance_score < 60).length}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-md p-3">
              <div className="text-sm text-gray-600">Plans Expiring Soon</div>
              <div className="text-xl font-semibold">
                {plans.filter(plan => {
                  const expDate = new Date(plan.expiration_date);
                  const now = new Date();
                  const threeMonthsFromNow = new Date();
                  threeMonthsFromNow.setMonth(now.getMonth() + 3);
                  return expDate <= threeMonthsFromNow;
                }).length}
              </div>
            </div>
          </div>
        </div>
        
        {/* Plan Types Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Plan Types</h3>
          <div className="space-y-3">
            {['EOP', 'COOP', 'HMP', 'IAP', 'AAR'].map(type => {
              const count = plans.filter(plan => plan.type === type).length;
              if (count === 0) return null;
              return (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      type === 'EOP' ? 'bg-blue-500' :
                      type === 'COOP' ? 'bg-green-500' :
                      type === 'HMP' ? 'bg-purple-500' :
                      type === 'IAP' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span>{type}</span>
                  </div>
                  <span className="text-gray-600">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t">
            <button className="text-blue-600 text-sm hover:underline">
              View All Plan Types
            </button>
          </div>
        </div>
        
        {/* Recent Activity Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { text: "Wildfire Hazard Mitigation Plan analyzed", time: "2 days ago" },
              { text: "San Mateo Evacuation Plan updated", time: "1 week ago" },
              { text: "Health Department COOP created", time: "2 weeks ago" }
            ].map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-2"></div>
                <div>
                  <div className="text-sm">{activity.text}</div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t">
            <button className="text-blue-600 text-sm hover:underline">
              View All Activity
            </button>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <h3 className="text-lg font-medium">Your Plans</h3>
            <span className="ml-2 bg-gray-100 text-gray-700 py-1 px-2 text-xs">{filteredPlans.length}</span>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search plans..." 
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
              value={planTypeFilter}
              onChange={(e) => setPlanTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              <option>EOP</option>
              <option>COOP</option>
              <option>HMP</option>
              <option>IAP</option>
              <option>AAR</option>
            </select>
            <select 
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Statuses</option>
              <option>Draft</option>
              <option>In Review</option>
              <option>Final</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredPlans.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Plan Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Compliance</th>
                  <th>Location</th>
                  <th>Expiration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="font-medium">{plan.title}</td>
                    <td>
                      <span className={`plan-type ${
                        plan.type === 'EOP' ? 'type-eop' : 
                        plan.type === 'COOP' ? 'type-coop' : 
                        plan.type === 'HMP' ? 'type-hmp' : 
                        'type-other'
                      }`}>
                        {plan.type}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        plan.status === 'Final' ? 'status-final' : 
                        plan.status === 'Draft' ? 'status-draft' : 
                        'status-review'
                      }`}>
                        {plan.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center">
                        <div className="w-12 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${
                              plan.compliance_score >= 71 ? 'bg-green-500' : 
                              plan.compliance_score >= 41 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${plan.compliance_score}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-md ${getScoreColorClass(plan.compliance_score)}`}>
                          {plan.compliance_score}%
                        </span>
                      </div>
                    </td>
                    <td>{plan.location}</td>
                    <td>
                      {new Date(plan.expiration_date).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        {plan.compliance_score > 0 ? (
                          // Plan has already been analyzed before
                          <>
                            <button 
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => navigate(`/gap-analysis-results/${plan.id}`)}
                            >
                              View Analysis
                            </button>
                            <button 
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleAnalyzePlan(plan.id)}
                            >
                              Re-analyze
                            </button>
                          </>
                        ) : (
                          // Plan hasn't been analyzed yet
                          <button 
                            className="text-blue-600 hover:text-blue-900"
                            onClick={() => handleAnalyzePlan(plan.id)}
                          >
                            Analyze
                          </button>
                        )}
                        <Link to={`/plans/${plan.id}`} className="text-blue-600 hover:text-blue-900">
                          View
                        </Link>
                        <button className="text-blue-600 hover:text-blue-900">
                          Edit
                        </button>
                      </div>
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
              <h3 className="mt-2 text-lg font-medium">{plans.length === 0 ? "Get started by uploading your first plan" : "No plans found"}</h3>
              <p className="mt-1 text-sm">{plans.length === 0 ? "Upload your emergency plans to analyze them against reference documents and standards" : "Try changing your search or filter criteria, or upload a new plan."}</p>
              <div className="mt-6">
                <button 
                  className="btn flex items-center mx-auto"
                  onClick={() => setUploadModalOpen(true)}
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload a new plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
            
            <h2 className="text-xl font-semibold mb-4">Upload New Plan</h2>
            
            <form onSubmit={handleUploadPlan}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Title</label>
                  <input 
                    type="text" 
                    name="title"
                    value={planForm.title}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                  <select 
                    name="type"
                    value={planForm.type}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  >
                    <option value="EOP">Emergency Operations Plan (EOP)</option>
                    <option value="COOP">Continuity of Operations Plan (COOP)</option>
                    <option value="HMP">Hazard Mitigation Plan (HMP)</option>
                    <option value="IAP">Incident Action Plan (IAP)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    name="status"
                    value={planForm.status}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  >
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    type="text" 
                    name="location"
                    value={planForm.location}
                    onChange={handleInputChange}
                    className="form-input w-full"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    name="description"
                    value={planForm.description}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Plan Document</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="form-input w-full"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, Word, Text, Markdown (Max 15MB)
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
                  ) : 'Upload Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;