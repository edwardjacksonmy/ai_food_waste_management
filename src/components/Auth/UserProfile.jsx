// src/components/Auth/UserProfile.jsx
import React from 'react';
import { useAuth } from './AuthContext';

const UserProfile = ({ className = "" }) => {
  const { user, signOut, loading } = useAuth();

  if (!user) return null;

  return (
    <div className={`bg-white shadow-md rounded px-4 sm:px-6 py-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="mb-2 sm:mb-0">
        <p className="text-gray-700">
          <span className="font-bold">Signed in as:</span> {user.email}
        </p>
      </div>
      <button
        onClick={signOut}
        disabled={loading}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm w-full sm:w-auto"
      >
        {loading ? 'Processing...' : 'Sign Out'}
      </button>
    </div>
  );
};

export default UserProfile;