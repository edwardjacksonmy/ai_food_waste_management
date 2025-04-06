// src/components/Auth/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// In AuthContext.jsx, use environment variables
const supabaseUrl = 'https://hcdjhkdyigmeaqonjvps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZGpoa2R5aWdtZWFxb25qdnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Nzg0NDMsImV4cCI6MjA1NzQ1NDQ0M30.rMJH8QOoCWhhkZkD0OpJNkGqWNM00nEk-GhJ9VKWw14';
const supabase = createClient(supabaseUrl, supabaseKey);

// Create context
const AuthContext = createContext();

// Create provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get the initial session
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          throw error;
        }
        setUser(data.session?.user || null);
      } catch (err) {
        console.error("Session error:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email, password) => {
    setLoading(true);
    try {
      // Add some logging for debugging
      console.log("Attempting to sign up with email:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("Signup error:", error);
        throw error;
      }
      
      console.log("Signup successful! Response:", data);
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError("This email is already registered. Please sign in instead.");
        return null;
      }
      
      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        console.log("Email confirmation required for:", email);
      } else if (data?.session) {
        console.log("User is signed in:", data.user.email);
      }
      
      return data;
    } catch (error) {
      console.error("Signup function error:", error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export supabase instance
export { supabase };