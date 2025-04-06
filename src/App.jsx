// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/Auth/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import FoodWasteApp from './components/FoodWasteApp';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <Header />
          <div className="flex-grow flex flex-col md:flex-row">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={
                <ProtectedRoute>
                  <div className="flex-grow flex flex-col md:flex-row w-full">
                    <Sidebar className="hidden md:block w-64 bg-white shadow-md" />
                    <main className="flex-grow p-4">
                      <FoodWasteApp />
                    </main>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;