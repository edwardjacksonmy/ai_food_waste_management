// src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const LoginForm = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const { signIn, signUp, loading, error, clearError } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setDebugInfo(null);

    try {
      if (isLoggingIn) {
        const result = await signIn(email, password);
        setDebugInfo({
          success: !!result,
          message: result ? 'Login successful!' : 'Login failed',
          user: result?.user || null
        });
        
        if (result && onSuccess) {
          onSuccess();
        }
      } else {
        const result = await signUp(email, password);
        setDebugInfo({
          success: !!result,
          message: result ? 'Registration successful! Check your email for confirmation.' : 'Registration failed',
          user: result?.user || null
        });
        
        if (result) {
          alert('Registration successful! Check your email for confirmation.');
          setIsLoggingIn(true);
        }
      }
    } catch (err) {
      setDebugInfo({
        success: false,
        message: err.message || 'An error occurred',
        error: err
      });
    }
  };

  const toggleMode = () => {
    setIsLoggingIn(!isLoggingIn);
    clearError();
    setDebugInfo(null);
  };

  return (
    <div className="bg-white shadow-md rounded px-4 sm:px-8 pt-6 pb-8 mb-4 w-full">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">
        {isLoggingIn ? 'Sign In' : 'Sign Up'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {debugInfo && (
        <div className={`${debugInfo.success ? 'bg-green-100 border-green-400 text-green-700' : 'bg-yellow-100 border-yellow-400 text-yellow-700'} border px-4 py-3 rounded mb-4`}>
          <p className="text-sm font-bold">Auth Debug Info:</p>
          <p className="text-sm">{debugInfo.message}</p>
          {debugInfo.user && (
            <div className="text-xs mt-2">
              <p>User ID: {debugInfo.user.id}</p>
              <p>Email: {debugInfo.user.email}</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label 
            className="block text-gray-700 text-sm font-bold mb-2" 
            htmlFor="email"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label 
            className="block text-gray-700 text-sm font-bold mb-2" 
            htmlFor="password"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="******************"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto"
            disabled={loading}
          >
            {loading 
              ? 'Processing...' 
              : isLoggingIn 
                ? 'Sign In' 
                : 'Sign Up'
            }
          </button>
          <button
            type="button"
            className="text-blue-500 hover:text-blue-800 text-sm font-bold mt-2 sm:mt-0"
            onClick={toggleMode}
          >
            {isLoggingIn 
              ? 'Need an account? Sign Up' 
              : 'Already have an account? Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;