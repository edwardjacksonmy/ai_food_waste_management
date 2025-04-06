// src/components/Sidebar.jsx - Updated for Food Waste Management System
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, supabase } from './Auth/AuthContext';

const Sidebar = ({ className }) => {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_type, name, organization_name')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleNavigation = (tab) => {
    navigate(`/app?tab=${tab}`);
  };

  if (!user) return null;

  return (
    <aside className={className}>
      <div className="p-4">
        <div className="mb-6 text-center">
          <div className="inline-block p-2 rounded-full bg-green-100 text-green-700 mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="font-semibold">
            {userProfile?.organization_name || userProfile?.name || user.email}
          </div>
          <div className="text-xs text-gray-500">
            {userProfile?.user_type === 'donor' ? 'Food Donor' : 'Food Recipient'}
          </div>
        </div>
        
        <h2 className="text-lg font-semibold mb-4">Menu</h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <button 
                onClick={() => handleNavigation('dashboard')}
                className={`block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700 ${
                  location.search.includes('tab=dashboard') || location.search === '' ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </div>
              </button>
            </li>
            {userProfile?.user_type === 'donor' && (
              <li>
                <button 
                  onClick={() => handleNavigation('create')}
                  className={`block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700 ${
                    location.search.includes('tab=create') ? 'bg-green-100 text-green-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Donation
                  </div>
                </button>
              </li>
            )}
            <li>
              <button 
                onClick={() => handleNavigation('transactions')}
                className={`block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700 ${
                  location.search.includes('tab=transactions') ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Transactions
                </div>
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('leaderboard')}
                className={`block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700 ${
                  location.search.includes('tab=leaderboard') ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Leaderboard
                </div>
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('profile')}
                className={`block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700 ${
                  location.search.includes('tab=profile') ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </div>
              </button>
            </li>
            <li>
              <button
                onClick={signOut}
                className="block w-full text-left py-2 px-4 rounded text-gray-700 hover:bg-green-100 hover:text-green-700"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </div>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;