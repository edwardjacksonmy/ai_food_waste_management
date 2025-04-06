// src/pages/LoginPage.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';
import LoginForm from '../components/Auth/LoginForm';

const LoginPage = () => {
  const { user } = useAuth();
  
  // Redirect if already logged in
  if (user) {
    return <Navigate to="/tasks" replace />;
  }
  
  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Task Manager</h1>
        <LoginForm onSuccess={() => {}} />
      </div>
    </div>
  );
};

export default LoginPage;