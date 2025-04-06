// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';
import FoodDonationForm from './FoodDonationForm';
import DonationsList from './DonationsList';
import TransactionsList from './TransactionsList';

const Dashboard = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('donations');
  const [donationToEdit, setDonationToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalDonations: 0,
    activeDonations: 0,
    completedTransactions: 0,
    impactMetrics: {
      foodWeight: 0,
      co2Saved: 0,
      mealsProvided: 0
    }
  });

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (!data || !data.name) {
          console.log("Incomplete user profile detected");
          // Redirect to profile creation
          window.location.href = "/app?tab=profile";
          return;
        }
        
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserProfile();
  }, [user]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !userProfile) return;
      
      try {
        // Initial stats values
        let totalDonations = 0;
        let activeDonations = 0;
        let completedTransactions = 0;
        let impactMetrics = {
          foodWeight: 0,
          co2Saved: 0,
          mealsProvided: 0
        };
        
        // If donor, fetch donation stats
        if (userProfile.user_type === 'donor') {
          // Total donations (using count query)
          const { count: donationsCount, error: countError } = await supabase
            .from('food_donations')
            .select('*', { count: 'exact', head: true })
            .eq('donor_id', user.id);
          
          if (countError) throw countError;
          totalDonations = donationsCount || 0;
          
          // Active donations (available, pending, claimed)
          const { data: activeData, error: activeError } = await supabase
            .from('food_donations')
            .select('id')
            .eq('donor_id', user.id)
            .in('status', ['available', 'pending', 'claimed']);
          
          if (activeError) throw activeError;
          activeDonations = activeData ? activeData.length : 0;
          
          // Completed transactions
          const { data: completedData, error: completedError } = await supabase
            .from('transactions')
            .select(`
              id,
              food_donations!inner(donor_id)
            `)
            .eq('food_donations.donor_id', user.id)
            .eq('status', 'completed');
          
          if (completedError) throw completedError;
          completedTransactions = completedData ? completedData.length : 0;
          
          // Fetch all completed transaction IDs for this donor
          const { data: donorTransactions, error: txError } = await supabase
            .from('transactions')
            .select(`
              id,
              food_donations!inner(donor_id)
            `)
            .eq('food_donations.donor_id', user.id)
            .eq('status', 'completed');
          
          if (txError) throw txError;
          
          if (donorTransactions && donorTransactions.length > 0) {
            const transactionIds = donorTransactions.map(t => t.id);
            
            // Get impact metrics for these transactions
            const { data: impactData, error: impactError } = await supabase
              .from('impact_metrics')
              .select('food_weight, co2_saved, meals_provided')
              .in('transaction_id', transactionIds);
            
            if (impactError) throw impactError;
            
            if (impactData && impactData.length > 0) {
              // Calculate totals
              impactMetrics = {
                foodWeight: impactData.reduce((sum, item) => sum + (parseFloat(item.food_weight) || 0), 0),
                co2Saved: impactData.reduce((sum, item) => sum + (parseFloat(item.co2_saved) || 0), 0),
                mealsProvided: impactData.reduce((sum, item) => sum + (parseInt(item.meals_provided) || 0), 0)
              };
            }
          }
        } else if (userProfile.user_type === 'recipient') {
          // For recipients, just show their completed transactions and impact
          const { data: completedData, error: completedError } = await supabase
            .from('transactions')
            .select('id')
            .eq('recipient_id', user.id)
            .eq('status', 'completed');
          
          if (completedError) throw completedError;
          completedTransactions = completedData ? completedData.length : 0;
            
          // Calculate estimated savings (add this section)
          let savedMoney = 0;

          if (completedData && completedData.length > 0) {
            const transactionIds = completedData.map(t => t.id);
            
            // Get impact metrics for these transactions
            const { data: impactData, error: impactError } = await supabase
              .from('impact_metrics')
              .select('food_weight, co2_saved, meals_provided')
              .in('transaction_id', transactionIds);
            
            if (impactError) throw impactError;
            
            if (impactData && impactData.length > 0) {
              // Calculate totals
              impactMetrics = {
                foodWeight: impactData.reduce((sum, item) => sum + (parseFloat(item.food_weight) || 0), 0),
                co2Saved: impactData.reduce((sum, item) => sum + (parseFloat(item.co2_saved) || 0), 0),
                mealsProvided: impactData.reduce((sum, item) => sum + (parseInt(item.meals_provided) || 0), 0)
              };
                // Estimate money saved (average $5 per meal)
                savedMoney = impactMetrics.mealsProvided * 5;
            }
          }
        }
        
        // Update stats state
        setStats({
          totalDonations,
          activeDonations,
          completedTransactions,
          impactMetrics,
          savedMoney
        });
        
        console.log("Dashboard stats updated:", {
          totalDonations,
          activeDonations,
          completedTransactions,
          impactMetrics
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      }
    };
  
    fetchStats();
  }, [user, userProfile]);

  // Handle donation added
  const handleDonationAdded = (donation) => {
    setDonationToEdit(null);
    setActiveTab('donations');
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalDonations: prev.totalDonations + 1,
      activeDonations: prev.activeDonations + 1
    }));
  };

  // Handle editing a donation
  const handleEditDonation = (donation) => {
    setDonationToEdit(donation);
    setActiveTab('create');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setDonationToEdit(null);
    setActiveTab('donations');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p>User profile not found. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Dashboard Header */}
      <div className="bg-white shadow-md rounded px-4 sm:px-8 py-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        {/* // Replace it with this safer version: */}
        <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">
            {userProfile.user_type === 'donor' ? 'Donor Dashboard' : 'Recipient Dashboard'}
        </h1>
        <p className="text-sm text-gray-600">
            Welcome, {userProfile.organization_name || userProfile.name || (user && user.email ? user.email.split('@')[0] : 'User')}!
        </p>
        </div>
          
          {userProfile.user_type === 'donor' && (
            <button
              onClick={() => {
                setDonationToEdit(null);
                setActiveTab('create');
              }}
              className="mt-3 sm:mt-0 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Create New Donation
            </button>
          )}
        </div>
      </div>
      
{/* Stats Section */}
<div className={`grid grid-cols-1 ${userProfile.user_type === 'donor' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-4 mb-4`}>
  {userProfile.user_type === 'donor' && (
    <>
      <div className="bg-white shadow-md rounded px-4 py-5 text-center">
        <div className="text-3xl font-bold text-blue-600">{stats.totalDonations}</div>
        <div className="text-sm text-gray-600">Total Donations</div>
      </div>
      
      <div className="bg-white shadow-md rounded px-4 py-5 text-center">
        <div className="text-3xl font-bold text-green-600">{stats.activeDonations}</div>
        <div className="text-sm text-gray-600">Active Donations</div>
      </div>
    </>
  )}
  
    {/* Common stats for both roles */}
    <div className="bg-white shadow-md rounded px-4 py-5 text-center">
        <div className="text-3xl font-bold text-purple-600">{stats.completedTransactions}</div>
        <div className="text-sm text-gray-600">Completed Pickups</div>
    </div>
    
    {userProfile.user_type === 'recipient' && (
        <div className="bg-white shadow-md rounded px-4 py-5 text-center">
        <div className="text-3xl font-bold text-blue-600">{stats.savedMoney ? `$${stats.savedMoney.toFixed(2)}` : '$0.00'}</div>
        <div className="text-sm text-gray-600">Estimated Savings</div>
        </div>
    )}
    </div>

    {/* Impact Section - Now with role-specific labels */}
    <div className="bg-white shadow-md rounded px-4 sm:px-8 py-4 mb-4">
    <h2 className="text-lg font-semibold mb-3">
        {userProfile.user_type === 'donor' ? 'Your Donation Impact' : 'Your Environmental Impact'}
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
            {stats.impactMetrics.foodWeight.toFixed(1)} kg
        </div>
        <div className="text-sm text-gray-600">
            {userProfile.user_type === 'donor' ? 'Food Donated' : 'Food Rescued'}
        </div>
        </div>
        
        <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
            {stats.impactMetrics.co2Saved.toFixed(1)} kg
        </div>
        <div className="text-sm text-gray-600">CO₂ Emissions Saved</div>
        </div>
        
        <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
            {stats.impactMetrics.mealsProvided}
        </div>
        <div className="text-sm text-gray-600">
            {userProfile.user_type === 'donor' ? 'Meals Provided' : 'Meals Received'}
        </div>
        </div>
    </div>
    </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'donations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('donations')}
            >
              {userProfile.user_type === 'donor' ? 'My Donations' : 'Available Donations'}
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block py-2 px-4 text-sm font-medium ${
                activeTab === 'transactions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              My Transactions
            </button>
          </li>
          {userProfile.user_type === 'donor' && (
            <li className="mr-2">
              <button
                className={`inline-block py-2 px-4 text-sm font-medium ${
                  activeTab === 'create'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => {
                  setDonationToEdit(null);
                  setActiveTab('create');
                }}
              >
                {donationToEdit ? 'Edit Donation' : 'Create Donation'}
              </button>
            </li>
          )}
        </ul>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'donations' && (
          <DonationsList 
            userType={userProfile.user_type} 
            onEditDonation={handleEditDonation} 
          />
        )}
        
        {activeTab === 'transactions' && (
          <TransactionsList userType={userProfile.user_type} />
        )}
        
        {activeTab === 'create' && userProfile.user_type === 'donor' && (
          <FoodDonationForm 
            onDonationAdded={handleDonationAdded} 
            donationToEdit={donationToEdit}
            onCancelEdit={handleCancelEdit}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;