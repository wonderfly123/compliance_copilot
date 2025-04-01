import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Copilot from '../components/copilot/Copilot';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    expiringPlans: 0,
    lowCompliancePlans: 0,
    criticalSectionsCount: 0,
    priorityPlans: [],
    sectionUpdates: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data from the API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Use temporary data while API endpoint is being completed
        // In production, this will be replaced with actual API call
        // const response = await axios.get('/api/documents/metrics');
        // setDashboardData(response.data.data);
        
        // Temporary data for development
        setDashboardData({
          expiringPlans: 2,
          lowCompliancePlans: 3,
          criticalSectionsCount: 15,
          priorityPlans: [
            { id: 1, title: 'Marin County EOP 2025', expires: '2025-06-30', lastUpdated: '2025-03-15', status: 'In Review', compliance: 85, criticalSections: 2 },
            { id: 2, title: 'City of Oakland Hazard Mitigation Plan', expires: '2025-04-15', lastUpdated: '2025-02-28', status: 'Draft', compliance: 72, criticalSections: 5 },
            { id: 4, title: 'San Mateo County Evacuation Plan', expires: '2025-05-22', lastUpdated: '2024-12-05', status: 'Needs Review', compliance: 63, criticalSections: 7 }
          ],
          sectionUpdates: [
            { section: 'Contact Information', plansAffected: 8, priority: 'High' },
            { section: 'Evacuation Routes', plansAffected: 4, priority: 'Critical' },
            { section: 'Resource Allocation', plansAffected: 6, priority: 'Medium' },
            { section: 'Communication Protocols', plansAffected: 5, priority: 'Critical' },
            { section: 'Recovery Procedures', plansAffected: 3, priority: 'Medium' }
          ]
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Function to get date in relative format
  const getRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return `${Math.abs(daysDiff)} days ago`;
    } else if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff === 1) {
      return 'Tomorrow';
    } else if (daysDiff <= 30) {
      return `In ${daysDiff} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return <div className="content-area">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="content-area text-red-600">{error}</div>;
  }

  return (
    <div className="content-area">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Emergency Management Dashboard</h2>
        <p className="text-gray-600">Welcome back, Jordan. Here's what needs your attention today.</p>
      </div>
      
      {/* Status Cards - Focus on actionable items */}
      <div className="metrics-container">
        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Plans Expiring Soon</h3>
            <div className="metric-icon" style={{ backgroundColor: '#FEF3C7' }}>
              <svg className="w-5 h-5" style={{ color: '#D97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="metric-value">{dashboardData.expiringPlans}</p>
          <p className="metric-description" style={{ color: '#D97706' }}>Expiring within 30 days</p>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Low Compliance Plans</h3>
            <div className="metric-icon" style={{ backgroundColor: '#FEE2E2' }}>
              <svg className="w-5 h-5" style={{ color: '#DC2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="metric-value">{dashboardData.lowCompliancePlans}</p>
          <p className="metric-description" style={{ color: '#DC2626' }}>Below 75% compliance</p>
        </div>
        
        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Critical Sections</h3>
            <div className="metric-icon" style={{ backgroundColor: '#FEF3C7' }}>
              <svg className="w-5 h-5" style={{ color: '#D97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="metric-value">{dashboardData.criticalSectionsCount}</p>
          <p className="metric-description" style={{ color: '#D97706' }}>Sections needing updates</p>
        </div>
      </div>
      
      {/* Priority Plans - Plans needing immediate attention */}
      <div className="mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Priority Plans</h3>
            <button className="text-blue-600 text-sm">View All Plans</button>
          </div>
          <div className="card-body">
            {dashboardData.priorityPlans.length > 0 ? (
              dashboardData.priorityPlans.map((plan) => (
                <div key={plan.id} className="plan-item">
                  <div className="plan-header">
                    <div>
                      <h4 className="plan-title">{plan.title}</h4>
                      <div className="plan-meta">
                        <span>Updated: {plan.lastUpdated}</span>
                        <span className="font-medium" style={{ color: 'var(--primary-color)' }}>
                          Expires: {getRelativeDate(plan.expires)}
                        </span>
                      </div>
                    </div>
                    <span className={`plan-status ${
                      plan.status === 'Final' ? 'status-final' : 
                      plan.status === 'In Review' ? 'status-review' : 
                      plan.status === 'Needs Review' ? 'status-needs-review' :
                      'status-draft'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="compliance-bar">
                      <div className="compliance-track">
                        <div 
                          className={`compliance-value ${
                            plan.compliance >= 90 ? 'compliance-high' : 
                            plan.compliance >= 75 ? 'compliance-medium' : 
                            'compliance-low'
                          }`} 
                          style={{width: `${plan.compliance}%`}}
                        ></div>
                      </div>
                      <span className="compliance-text">{plan.compliance}%</span>
                    </div>
                    {plan.criticalSections > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {plan.criticalSections} critical section{plan.criticalSections > 1 ? 's' : ''} need{plan.criticalSections > 1 ? '' : 's'} attention
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4">No priority plans to display</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Common Sections Needing Updates */}
      <div className="mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Common Sections Needing Updates</h3>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Affected Plans</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.sectionUpdates.map((item, index) => (
                  <tr key={index}>
                    <td className="font-medium">{item.section}</td>
                    <td>{item.plansAffected} plans</td>
                    <td>
                      <span className={`plan-status ${
                        item.priority === 'Critical' ? 'status-needs-review' : 
                        item.priority === 'High' ? 'status-draft' : 
                        'status-review'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              className="btn btn-outline flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Create New Plan
            </button>
            <button 
              className="btn btn-outline flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
              </svg>
              Run Compliance Check
            </button>
            <button 
              className="btn btn-outline flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              Browse Templates
            </button>
          </div>
        </div>
      </div>
      
      {/* Copilot component */}
      <Copilot />
    </div>
  );
};

export default Dashboard;
