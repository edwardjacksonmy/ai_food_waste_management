// src/components/Header.jsx - Updated for Food Waste Management System
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './Auth/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="bg-green-700 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <svg 
            className="w-8 h-8 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          <h1 className="text-xl font-bold">Food Rescue Hub</h1>
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 rounded focus:outline-none focus:ring-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-4">
            {user && (
              <>
                <li><Link to="/app" className="hover:text-gray-300">Dashboard</Link></li>
                <li><button onClick={signOut} className="hover:text-gray-300">Sign Out</button></li>
              </>
            )}
            {!user && (
              <li><Link to="/login" className="hover:text-gray-300">Login</Link></li>
            )}
          </ul>
        </nav>
      </div>

      {/* Mobile menu (slides down when menu button is clicked) */}
      {isMenuOpen && (
        <div className="md:hidden bg-green-800">
          <nav className="px-4 py-3">
            <ul className="space-y-2">
              {user && (
                <>
                  <li><Link to="/app" className="block py-1 hover:text-gray-300">Dashboard</Link></li>
                  <li><button onClick={signOut} className="block py-1 w-full text-left hover:text-gray-300">Sign Out</button></li>
                </>
              )}
              {!user && (
                <li><Link to="/login" className="block py-1 hover:text-gray-300">Login</Link></li>
              )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;