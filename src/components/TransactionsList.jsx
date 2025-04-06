// src/components/TransactionsList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';
import { convertToKg, calculateCO2Savings, calculateMealsProvided, calculateFoodValue } from "../utils/metricsUtils";
import Pagination from './Pagination';
import ImpactMetricsModal from './ImpactMetricsModal';

const TransactionsList = ({ userType }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [foodCategories, setFoodCategories] = useState({});
  const [debug, setDebug] = useState(null); // For debugging purposes
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 5; // Transactions often have more data, so show fewer per page

  // Ensure string format for IDs to avoid type mismatches
  const ensureString = (id) => {
    return id ? String(id) : null;
  };
  
  // Fetch food categories for display
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('food_categories')
          .select('*');
        
        if (error) throw error;
        
        // Create a lookup object
        const categoryMap = {};
        data.forEach(category => {
          categoryMap[category.id] = category.name;
        });
        
        setFoodCategories(categoryMap);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch transactions with pagination
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        let countQuery;
        let dataQuery;
        
        if (userType === 'donor') {
          // Fetch the donor's donations first
          const { data: donorDonations, error: donorError } = await supabase
            .from('food_donations')
            .select('id')
            .eq('donor_id', ensureString(user.id));
          
          if (donorError) throw donorError;
          
          if (!donorDonations || donorDonations.length === 0) {
            setTransactions([]);
            setTotalCount(0);
            setTotalPages(1);
            setLoading(false);
            return;
          }
          
          // Get donation IDs
          const donationIds = donorDonations.map(d => d.id);
          
          // Count query for pagination
          countQuery = supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .in('donation_id', donationIds);
            
          // Apply status filter to count query if not 'all'
          if (filter !== 'all') {
            countQuery = countQuery.eq('status', filter);
          }
          
          const { count, error: countError } = await countQuery;
          
          if (countError) throw countError;
          
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / itemsPerPage));
          
          // Now fetch transactions with pagination
          dataQuery = supabase
            .from('transactions')
            .select(`
              *,
              food_donations (
                id, title, description, quantity, quantity_unit, food_type,
                pickup_start_time, pickup_end_time, status, is_perishable
              ),
              recipient:users (
                id, name, organization_name, phone_number, email
              )
            `)
            .in('donation_id', donationIds);
          
          // Apply status filter if not 'all'
          if (filter !== 'all') {
            dataQuery = dataQuery.eq('status', filter);
          }
          
          // Add pagination
          dataQuery = dataQuery
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
          
          const { data, error } = await dataQuery;
          
          if (error) throw error;
          
          // Debug info
          setDebug({
            userType: 'donor',
            donationIds: donationIds,
            transactionCount: data ? data.length : 0,
            totalCount: count || 0,
            currentPage,
            totalPages: Math.ceil((count || 0) / itemsPerPage)
          });
          
          setTransactions(data || []);
        } 
        else if (userType === 'recipient') {
          // For recipients - query is simpler
          countQuery = supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', ensureString(user.id));
            
          if (filter !== 'all') {
            countQuery = countQuery.eq('status', filter);
          }
          
          const { count, error: countError } = await countQuery;
          
          if (countError) throw countError;
          
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / itemsPerPage));
          
          dataQuery = supabase
            .from('transactions')
            .select(`
              *,
              food_donations (
                id, title, description, quantity, quantity_unit, food_type,
                pickup_start_time, pickup_end_time, status, is_perishable,
                donor_id
              ),
              donor:food_donations(donor_id(
                id, name, organization_name, phone_number, email
              ))
            `)
            .eq('recipient_id', ensureString(user.id));
          
          if (filter !== 'all') {
            dataQuery = dataQuery.eq('status', filter);
          }
          
          // Add pagination
          dataQuery = dataQuery
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
          
          const { data, error } = await dataQuery;
          
          if (error) throw error;
          
          // Debug info
          setDebug({
            userType: 'recipient',
            transactionCount: data ? data.length : 0,
            totalCount: count || 0,
            currentPage,
            totalPages: Math.ceil((count || 0) / itemsPerPage)
          });
          
          setTransactions(data || []);
        } else {
          throw new Error('Invalid user type');
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(`Failed to load transactions: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, userType, filter, currentPage]); // Added currentPage to dependencies

  // Handle accepting a request (for donors)
  const handleAcceptRequest = async (transactionId) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'confirmed' })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Get the donation ID
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction || !transaction.food_donations) {
        throw new Error('Transaction or donation not found');
      }
      
      // Update donation status
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'claimed' })
        .eq('id', transaction.food_donations.id);
      
      if (donationError) throw donationError;
      
      // Update local state
      setTransactions(transactions.map(t => 
        t.id === transactionId ? { ...t, status: 'confirmed' } : t
      ));
      
      alert('Pickup request confirmed! The recipient will be notified.');
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request. Please try again.');
    }
  };

  // Handle rejecting a request (for donors)
  const handleRejectRequest = async (transactionId) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Get the donation ID
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction || !transaction.food_donations) {
        throw new Error('Transaction or donation not found');
      }
      
      // Update donation status back to available
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'available' })
        .eq('id', transaction.food_donations.id);
      
      if (donationError) throw donationError;
      
      // Update local state
      setTransactions(transactions.map(t => 
        t.id === transactionId ? { ...t, status: 'rejected' } : t
      ));
      
      alert('Pickup request rejected.');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request. Please try again.');
    }
  };

  // Handle marking a transaction as completed
  const handleCompleteTransaction = async (transactionId) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          actual_pickup_time: new Date().toISOString()
        })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Get donation data for metrics calculation
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select(`
          *,
          food_donations(id, food_type, quantity, quantity_unit)
        `)
        .eq('id', transactionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate and store metrics automatically
      if (transaction?.food_donations) {
        const donation = transaction.food_donations;
        
        const foodWeight = convertToKg(donation.quantity, donation.quantity_unit);
        const co2Saved = calculateCO2Savings(donation.food_type, donation.quantity, donation.quantity_unit);
        const mealsProvided = calculateMealsProvided(donation.food_type, donation.quantity, donation.quantity_unit);
        const estimatedValue = calculateFoodValue(donation.food_type, donation.quantity, donation.quantity_unit);
        
        // Check if metrics already exist
        const { data: existingMetrics } = await supabase
          .from('impact_metrics')
          .select('id')
          .eq('transaction_id', transactionId)
          .single();
        
        if (!existingMetrics) {
          // Insert metrics if they don't exist
          await supabase
            .from('impact_metrics')
            .insert({
              transaction_id: transactionId,
              food_weight: parseFloat(foodWeight.toFixed(2)),
              co2_saved: parseFloat(co2Saved.toFixed(2)),
              meals_provided: mealsProvided,
              estimated_value: parseFloat(estimatedValue.toFixed(2))
            });
            
          console.log("Created impact metrics automatically for transaction:", transactionId);
        }
      }
      
      // Update local state
      setTransactions(transactions.map(t => 
        t.id === transactionId ? { ...t, status: 'completed' } : t
      ));
      
      alert('Pickup marked as completed successfully!');
    } catch (err) {
      console.error('Error completing transaction:', err);
      alert(`Failed to complete transaction: ${err.message}`);
    }
  };

  // Handle submitting feedback/rating
  const handleSubmitFeedback = async (transactionId) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    // Prompt for rating
    const rating = parseInt(prompt('Rate this transaction (1-5 stars):', '5'));
    if (isNaN(rating) || rating < 1 || rating > 5) {
      alert('Please enter a valid rating between 1 and 5.');
      return;
    }
    
    // Prompt for feedback
    const feedback = prompt('Please provide any feedback (optional):');
    
    try {
      const updates = {};
      
      if (userType === 'donor') {
        updates.recipient_rating = rating;
        updates.donor_feedback = feedback;
      } else {
        updates.donor_rating = rating;
        updates.recipient_feedback = feedback;
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId);
      
      if (error) throw error;
      
      // Update local state
      setTransactions(transactions.map(t => 
        t.id === transactionId ? { ...t, ...updates } : t
      ));
      
      alert('Thank you for your feedback!');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  // Get impact metrics for a completed transaction
  const fetchImpactMetrics = async (transactionId) => {
    try {
      // First check if metrics already exist
      const { data, error } = await supabase
        .from('impact_metrics')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        console.log("Retrieved existing metrics:", data);
        setCurrentMetrics(data);
        setMetricsModalOpen(true);
      } else {
        // Get the donation details first to calculate accurate metrics
        const { data: transactionData, error: txError } = await supabase
          .from('transactions')
          .select(`
            *,
            food_donations(
              id, food_type, quantity, quantity_unit, is_perishable
            )
          `)
          .eq('id', transactionId)
          .single();
        
        if (txError) throw txError;
        
        if (!transactionData || !transactionData.food_donations) {
          throw new Error('Could not find donation data for this transaction');
        }
        
        const donation = transactionData.food_donations;
        
        // Calculate metrics based on donation details
        const foodWeight = convertToKg(donation.quantity, donation.quantity_unit);
        const co2Saved = calculateCO2Savings(donation.food_type, donation.quantity, donation.quantity_unit);
        const mealsProvided = calculateMealsProvided(donation.food_type, donation.quantity, donation.quantity_unit);
        const estimatedValue = calculateFoodValue(donation.food_type, donation.quantity, donation.quantity_unit);
        
        const metricsData = {
          transaction_id: transactionId,
          food_weight: parseFloat(foodWeight.toFixed(2)),
          co2_saved: parseFloat(co2Saved.toFixed(2)),
          meals_provided: mealsProvided,
          estimated_value: parseFloat(estimatedValue.toFixed(2))
        };
        
        // Save metrics to database
        const { error: insertError } = await supabase
          .from('impact_metrics')
          .insert(metricsData);
        
        if (insertError) throw insertError;
        
        console.log("Created new metrics:", metricsData);
        setCurrentMetrics(metricsData);
        setMetricsModalOpen(true);
      }
    } catch (err) {
      console.error('Error with impact metrics:', err);
      alert('Failed to process impact metrics: ' + err.message);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing pages
  };

  return (
    <div className="bg-white shadow-md rounded px-4 sm:px-8 pt-6 pb-8 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">My Transactions</h2>
        
        <div className="mt-2 sm:mt-0">
          <select
            className="shadow border rounded py-1 px-2 text-gray-700 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Transactions</option>
            <option value="requested">Pending Requests</option>
            <option value="confirmed">Confirmed Pickups</option>
            <option value="completed">Completed Pickups</option>
            <option value="rejected">Rejected Requests</option>
            <option value="canceled">Canceled Transactions</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">Loading transactions...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">No transactions found.</span>
        </div>
      ) : (
        <div>
          {transactions.map(transaction => {
            // Extract donor info from nested objects for recipients
            let donorInfo = null;
            if (userType === 'recipient' && transaction.donor) {
              // Find the donor info in the nested structure
              const donorValues = Object.values(transaction.donor || {});
              donorInfo = donorValues.length > 0 ? donorValues[0] : null;
            }
            
            return (
            <div key={transaction.id} className="border-b py-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Transaction Details */}
                <div className="flex-grow">
                  {/* Status Indicator */}
                  <div className="mb-3">
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center ${transaction.status === 'requested' || transaction.status === 'confirmed' || transaction.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.status === 'requested' || transaction.status === 'confirmed' || transaction.status === 'completed' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                            1
                          </div>
                          <div className="ml-2 text-xs">Requested</div>
                        </div>
                        <div className={`flex-grow border-t-2 mx-2 ${transaction.status === 'confirmed' || transaction.status === 'completed' ? 'border-green-600' : 'border-gray-200'}`}></div>
                        <div className={`flex items-center ${transaction.status === 'confirmed' || transaction.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.status === 'confirmed' || transaction.status === 'completed' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                            2
                          </div>
                          <div className="ml-2 text-xs">Confirmed</div>
                        </div>
                        <div className={`flex-grow border-t-2 mx-2 ${transaction.status === 'completed' ? 'border-green-600' : 'border-gray-200'}`}></div>
                        <div className={`flex items-center ${transaction.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transaction.status === 'completed' ? 'bg-green-100 border-2 border-green-600' : 'bg-gray-100'}`}>
                            3
                          </div>
                          <div className="ml-2 text-xs">Completed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-1">
                    <h3 className="font-medium text-gray-800 mr-2">
                      {transaction.food_donations ? transaction.food_donations.title : 'Transaction'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    {transaction.food_donations ? transaction.food_donations.description : ''}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    {transaction.food_donations && (
                      <p className="text-sm">
                        <span className="font-semibold">Quantity:</span>{' '}
                        {transaction.food_donations.quantity} {transaction.food_donations.quantity_unit}
                      </p>
                    )}
                    
                    {transaction.food_donations && transaction.food_donations.food_type && foodCategories[transaction.food_donations.food_type] && (
                      <p className="text-sm">
                        <span className="font-semibold">Category:</span>{' '}
                        {foodCategories[transaction.food_donations.food_type]}
                      </p>
                    )}
                    
                    <p className="text-sm">
                      <span className="font-semibold">
                        {userType === 'donor' ? 'Recipient:' : 'Donor:'}
                      </span>{' '}
                      {userType === 'donor' 
                        ? (transaction.recipient ? (transaction.recipient.organization_name || transaction.recipient.name) : 'Unknown recipient')
                        : (donorInfo ? (donorInfo.organization_name || donorInfo.name) : 'Unknown donor')
                      }
                    </p>
                    
                    <p className="text-sm">
                      <span className="font-semibold">Contact:</span>{' '}
                      {userType === 'donor' 
                        ? (transaction.recipient ? (transaction.recipient.phone_number || transaction.recipient.email) : 'No contact info')
                        : (donorInfo ? (donorInfo.phone_number || donorInfo.email) : 'No contact info')
                      }
                    </p>
                    
                    <p className="text-sm">
                      <span className="font-semibold">Scheduled Pickup:</span>{' '}
                      {formatDate(transaction.scheduled_pickup_time)}
                    </p>
                    
                    {transaction.actual_pickup_time && (
                      <p className="text-sm">
                        <span className="font-semibold">Actual Pickup:</span>{' '}
                        {formatDate(transaction.actual_pickup_time)}
                      </p>
                    )}
                    
                    {userType === 'donor' && transaction.recipient_rating && (
                      <p className="text-sm">
                        <span className="font-semibold">Recipient Rating:</span>{' '}
                        {'⭐'.repeat(transaction.recipient_rating)}
                      </p>
                    )}
                    
                    {userType === 'recipient' && transaction.donor_rating && (
                      <p className="text-sm">
                        <span className="font-semibold">Donor Rating:</span>{' '}
                        {'⭐'.repeat(transaction.donor_rating)}
                      </p>
                    )}
                    
                    {userType === 'donor' && transaction.recipient_feedback && (
                      <p className="text-sm col-span-2">
                        <span className="font-semibold">Recipient Feedback:</span>{' '}
                        {transaction.recipient_feedback}
                      </p>
                    )}
                    
                    {userType === 'recipient' && transaction.donor_feedback && (
                      <p className="text-sm col-span-2">
                        <span className="font-semibold">Donor Feedback:</span>{' '}
                        {transaction.donor_feedback}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Status-specific instructions */}
                  {transaction.status === 'requested' && userType === 'donor' && (
                    <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 mb-2">
                      This recipient has requested your donation. Please accept or reject the request.
                    </div>
                  )}
                  
                  {transaction.status === 'confirmed' && userType === 'recipient' && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                      The donor has confirmed your request. After pickup, please mark it as completed.
                    </div>
                  )}
                  
                  {transaction.status === 'completed' && !transaction.recipient_rating && userType === 'donor' && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200 mb-2">
                      Transaction completed! Please leave your feedback.
                    </div>
                  )}
                  
                  {transaction.status === 'completed' && !transaction.donor_rating && userType === 'recipient' && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200 mb-2">
                      Transaction completed! Please leave your feedback.
                    </div>
                  )}
                  
                  {/* Donor actions */}
                  {userType === 'donor' && transaction.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleAcceptRequest(transaction.id)}
                        className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleRejectRequest(transaction.id)}
                        className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                      >
                        Reject Request
                      </button>
                    </>
                  )}

                  {/* Recipient actions */}
                  {userType === 'recipient' && (
                    <>
                      {/* Mark as completed button */}
                      {transaction.status === 'confirmed' && (
                        <button
                          onClick={() => handleCompleteTransaction(transaction.id)}
                          className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                          Confirm Pickup
                        </button>
                      )}
                      
                      {/* Cancel request button */}
                      {transaction.status === 'requested' && (
                        <button
                          onClick={() => updateTransactionStatus(transaction.id, 'canceled')}
                          className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                          Cancel Request
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Feedback button */}
                  {transaction.status === 'completed' && (
                    (userType === 'donor' && !transaction.recipient_rating) || 
                    (userType === 'recipient' && !transaction.donor_rating)
                  ) && (
                    <button
                      onClick={() => handleSubmitFeedback(transaction.id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                    >
                      Leave Feedback
                    </button>
                  )}
                  
                  {/* Impact metrics button */}
                  {transaction.status === 'completed' && (
                    <button
                      onClick={() => fetchImpactMetrics(transaction.id)}
                      className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                    >
                      View Impact
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
          
          {/* Transaction count */}
          <div className="text-sm text-gray-500 text-center mt-4">
            Showing {transactions.length} of {totalCount} transactions
          </div>

          {/* Impact Metrics Modal */}
          <ImpactMetricsModal 
            isOpen={metricsModalOpen}
            onClose={() => setMetricsModalOpen(false)}
            metrics={currentMetrics}
          />
        </div>
      )}
    </div>
  );
};

export default TransactionsList;