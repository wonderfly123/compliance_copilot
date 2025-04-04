import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const Sidebar = ({ expanded, toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);
  
  // Navigation items data
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', to: '/' },
    { id: 'plans', label: 'Plans', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', to: '/plans' },
    { id: 'references', label: 'Reference Docs', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2', to: '/references' },
    { id: 'templates', label: 'Templates', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', to: '/templates' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', to: '/settings' }
  ];
  
  // Handle logout
  const handleLogout = () => {
    logout();
  };
  
  return (
    <div className={`sidebar ${expanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* Logo and sidebar toggle */}
      <div className="sidebar-header">
        {expanded ? (
          <>
            <div className="text-xl font-bold">Revali</div>
            <button 
              onClick={toggleSidebar}
              className="p-1 hover:bg-opacity-20 hover:bg-white flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="text-xl font-bold text-center flex-grow">R</div>
            <button 
              onClick={toggleSidebar}
              className="p-1 hover:bg-opacity-20 hover:bg-white flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Navigation items */}
      <div className="sidebar-nav">
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) => `
                nav-item ${isActive ? 'active' : ''} ${!expanded ? 'justify-center' : ''}
              `}
            >
              <svg 
                className={`${expanded ? 'mr-3' : ''} h-6 w-6`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {expanded && item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      
      {/* User profile section */}
      {expanded ? (
        <div className="sidebar-footer">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold">
              {user && user.name ? user.name.split(' ').map(n => n[0]).join('') : 'JM'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user ? user.name : 'Jordan Millhausen'}</p>
              <p className="text-xs">{user && user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="sidebar-footer">
          <div className="w-full flex justify-center p-2">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold">
              {user && user.name ? user.name.split(' ').map(n => n[0]).join('') : 'JM'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;