// src/components/DonationsList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';
import Pagination from './Pagination';

const DonationsList = ({ userType, onEditDonation }) => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [foodCategories, setFoodCategories] = useState({});
  const [searchDistance, setSearchDistance] = useState(10); // default 10km
  const [userLocation, setUserLocation] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortOption, setSortOption] = useState('expiration_asc');
  const [debug, setDebug] = useState(false); // Debug state
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10; // Number of items to display per page

  // Ensure string format for IDs to avoid type mismatches
  const ensureString = (id) => {
    return id ? String(id) : null;
  };

  // Fetch food categories for display names
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('food_categories')
          .select('*');
        
        if (error) throw error;
        
        // Create a lookup object for easy access
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

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('location_latitude, location_longitude')
          .eq('id', ensureString(user.id))
          .single();
        
        if (error) throw error;
        
        if (data && data.location_latitude && data.location_longitude) {
          setUserLocation({
            latitude: data.location_latitude,
            longitude: data.location_longitude
          });
          console.log('User location loaded:', {
            latitude: data.location_latitude,
            longitude: data.location_longitude
          });
        } else {
          console.log('User has no location data');
          // For recipients with no location, set a default so they can see donations
          if (userType === 'recipient') {
            // Set a default location as a fallback (center of the city)
            setUserLocation({
              latitude: 3.139003, // Kuala Lumpur coordinates as example
              longitude: 101.686855
            });
            console.log('Set default location for recipient');
          }
        }
      } catch (err) {
        console.error('Error fetching user location:', err);
        // For recipients with error fetching location, set a default
        if (userType === 'recipient') {
          setUserLocation({
            latitude: 3.139003, // Kuala Lumpur coordinates as example
            longitude: 101.686855
          });
          console.log('Set default location due to error');
        }
      }
    };

    getUserLocation();
  }, [user, userType]);

  // Fetch donations with pagination
  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (userType === 'donor' && user) {
          console.log('Fetching donations for donor, user ID:', ensureString(user.id));
          
          // Count query for pagination
          const { count, error: countError } = await supabase
            .from('food_donations')
            .select('*', { count: 'exact', head: true })
            .eq('donor_id', ensureString(user.id));
            
          if (countError) throw countError;
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / itemsPerPage));
          
          console.log(`Found ${count} donations for donor, showing page ${currentPage} of ${Math.ceil((count || 0) / itemsPerPage)}`);
          
          // Data query with pagination
          const { data, error } = await supabase
            .from('food_donations')
            .select(`
              *,
              transactions(
                id,
                recipient_id,
                status,
                scheduled_pickup_time,
                users:recipient_id(name, organization_name)
              )
            `)
            .eq('donor_id', ensureString(user.id))
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
          
          if (error) throw error;
          
          console.log('Donor donations retrieved:', data ? data.length : 0);
          if (debug) console.log('Donation data:', data);
          
          setDonations(data || []);
        } 
        else if (userType === 'recipient' && user) {
          console.log('Fetching available donations for recipient, user ID:', ensureString(user.id));
          
          // For recipients, we need to handle distance-based filtering differently
          // First get available donations count
          let countQuery = supabase
            .from('food_donations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'available');
          
          if (filterCategory) {
            countQuery = countQuery.eq('food_type', filterCategory);
          }
            
          const { count, error: countError } = await countQuery;
          console.log('Total available donations count before filtering:', count || 0);
          
          if (countError) throw countError;
          
          // Set approximate total pages (we'll filter by distance client-side)
          setTotalCount(count || 0);
          const estimatedPages = Math.ceil((count || 0) / itemsPerPage);
          setTotalPages(estimatedPages);
          
          // Fetch all available donations with their donor info
          let query = supabase
            .from('food_donations')
            .select(`
              *,
              users:donor_id(id, name, organization_name),
              transactions(
                id,
                recipient_id,
                status,
                scheduled_pickup_time
              )
            `)
            .eq('status', 'available');
          
          // Apply category filter if selected
          if (filterCategory) {
            query = query.eq('food_type', filterCategory);
            console.log('Filtering by category:', filterCategory);
          }
          
          // Apply sorting
          switch (sortOption) {
            case 'expiration_asc':
              query = query.order('expiration_date', { ascending: true });
              console.log('Sorting by expiration date (ascending)');
              break;
            case 'expiration_desc':
              query = query.order('expiration_date', { ascending: false });
              console.log('Sorting by expiration date (descending)');
              break;
            case 'created_desc':
              query = query.order('created_at', { ascending: false });
              console.log('Sorting by creation date (descending)');
              break;
            default:
              query = query.order('expiration_date', { ascending: true });
              console.log('Default sorting by expiration date (ascending)');
          }
          
          const { data, error } = await query;
          console.log('Raw data from Supabase:', data ? data.length : 0, 'available donations');
          if (debug) console.log('Available donations:', data);
          
          if (error) throw error;
          
          let processedDonations = data || [];
          
          // Calculate distance and filter by distance
          if (userLocation) {
            console.log('User location:', userLocation, ', Filtering by distance:', searchDistance, 'km');
            
            processedDonations = processedDonations.map(donation => {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                donation.pickup_latitude, 
                donation.pickup_longitude
              );
              
              return {
                ...donation,
                distance
              };
            });
            
            // Only filter by distance if not using "No Limit" option (1000 km)
            if (searchDistance < 1000) {
              processedDonations = processedDonations.filter(donation => 
                donation.distance <= searchDistance
              );
            }
            
            console.log('After distance filtering:', processedDonations.length, 'donations remain');
            
            // If sorting by distance, do it here
            if (sortOption === 'distance_asc') {
              processedDonations.sort((a, b) => a.distance - b.distance);
              console.log('Sorted by distance');
            }
            
            // Update total count and pages after distance filtering
            setTotalCount(processedDonations.length);
            setTotalPages(Math.ceil(processedDonations.length / itemsPerPage));
            
            // Now apply pagination client-side
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            
            console.log(`Showing page ${currentPage}: items ${start} to ${Math.min(end, processedDonations.length)} of ${processedDonations.length}`);
            
            processedDonations = processedDonations.slice(start, end);
          } else {
            console.log('Warning: No user location available for distance filtering');
            // Apply simple pagination if no location filtering
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            processedDonations = processedDonations.slice(start, end);
          }
          
          setDonations(processedDonations);
        } else {
          // Not authenticated or unknown user type
          throw new Error('Authentication required');
        }
      } catch (err) {
        console.error('Error fetching donations:', err);
        setError(`Failed to load donations: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [user, userType, searchDistance, filterCategory, sortOption, userLocation, currentPage, itemsPerPage, debug]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      console.log('Missing coordinates:', { lat1, lon1, lat2, lon2 });
      // Return a reasonable default (10km) instead of Infinity
      // This allows donations with missing coordinates to still be seen
      return 10;
    }
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(1));
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Debugging function to show all available donations regardless of filters
  const showAllDonations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_donations')
        .select('*, users:donor_id(id, name, organization_name)')
        .eq('status', 'available');
        
      if (error) throw error;
      
      console.log('All available donations in the database:', data);
      alert(`Found ${data ? data.length : 0} available donations in the database.`);
      
      // Toggle debug mode to see all data
      setDebug(!debug);
    } catch (err) {
      console.error('Debug query failed:', err);
      alert(`Error in debug query: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle request for donation (for recipients)
  const handleRequestDonation = async (donationId) => {
    if (!user) return;
    
    try {
      // Check if there's already a request
      const { data: existingRequests } = await supabase
        .from('transactions')
        .select('*')
        .eq('donation_id', donationId)
        .eq('recipient_id', ensureString(user.id));
      
      if (existingRequests && existingRequests.length > 0) {
        alert('You have already requested this donation.');
        return;
      }
      
      // Create a new transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          donation_id: donationId,
          recipient_id: ensureString(user.id),
          status: 'requested',
          scheduled_pickup_time: new Date().toISOString() // Default time, will be updated later
        });
      
      if (error) throw error;
      
      // Update donation status
      await supabase
        .from('food_donations')
        .update({ status: 'pending' })
        .eq('id', donationId);
      
      alert('Donation requested successfully! The donor will be notified.');
      
      // Refresh the list
      setDonations(donations.filter(d => d.id !== donationId));
    } catch (err) {
      console.error('Error requesting donation:', err);
      alert('Failed to request donation. Please try again.');
    }
  };

  // Handle cancellation of donation (for donors)
  const handleCancelDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to cancel this donation?')) return;
    
    try {
      // Update donation status
      const { error } = await supabase
        .from('food_donations')
        .update({ status: 'expired' })
        .eq('id', donationId)
        .eq('donor_id', ensureString(user.id));
      
      if (error) throw error;
      
      // Update the list
      setDonations(donations.map(d => 
        d.id === donationId ? { ...d, status: 'expired' } : d
      ));
      
      alert('Donation cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling donation:', err);
      alert('Failed to cancel donation. Please try again.');
    }
  };

  // Handle accepting a request (for donors)
  const handleAcceptRequest = async (donationId, transactionId) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'confirmed' })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Update donation status
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'claimed' })
        .eq('id', donationId);
      
      if (donationError) throw donationError;
      
      // Refresh the list
      setDonations(donations.map(d => {
        if (d.id === donationId) {
          return {
            ...d,
            status: 'claimed',
            transactions: d.transactions.map(t => 
              t.id === transactionId ? { ...t, status: 'confirmed' } : t
            )
          };
        }
        return d;
      }));
      
      alert('Pickup request confirmed! The recipient will be notified.');
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request. Please try again.');
    }
  };

  // Handle rejecting a request (for donors)
  const handleRejectRequest = async (donationId, transactionId) => {
    try {
      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Check if there are other pending requests
      const { data: otherRequests, error: countError } = await supabase
        .from('transactions')
        .select('id')
        .eq('donation_id', donationId)
        .eq('status', 'requested');
      
      if (countError) throw countError;
      
      // If no other pending requests, set donation back to available
      if (!otherRequests || otherRequests.length === 0) {
        const { error: donationError } = await supabase
          .from('food_donations')
          .update({ status: 'available' })
          .eq('id', donationId);
        
        if (donationError) throw donationError;
      }
      
      // Refresh the list
      setDonations(donations.map(d => {
        if (d.id === donationId) {
          const updatedTransactions = d.transactions.map(t => 
            t.id === transactionId ? { ...t, status: 'rejected' } : t
          );
          
          const hasOtherPendingRequests = updatedTransactions.some(t => 
            t.id !== transactionId && t.status === 'requested'
          );
          
          return {
            ...d,
            status: hasOtherPendingRequests ? 'pending' : 'available',
            transactions: updatedTransactions
          };
        }
        return d;
      }));
      
      alert('Pickup request rejected.');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request. Please try again.');
    }
  };
  
  // Handle deletion of donation (for donors)
  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to delete this donation? This action cannot be undone.')) return;
  
    try {
      // Start by checking for active transactions that should block deletion
      const { data: activeTransactions, error: activeError } = await supabase
        .from('transactions')
        .select('id')
        .eq('donation_id', donationId)
        .in('status', ['requested', 'confirmed']);
  
      if (activeError) throw activeError;
      
      // Do not allow deletion if there are active transactions
      if (activeTransactions && activeTransactions.length > 0) {
        alert('This donation cannot be deleted because it has active requests. You must reject all requests or wait for them to be canceled first.');
        return;
      }

      // Instead of deleting, update the donation to have an "expired" status
      // This avoids foreign key constraint issues while functionally removing it
      const { error: updateError } = await supabase
        .from('food_donations')
        .update({ 
          status: 'expired',
          title: '[DELETED] ' + (new Date()).toISOString().split('T')[0],
          description: 'This donation has been permanently deleted by the donor.'
        })
        .eq('id', donationId)
        .eq('donor_id', ensureString(user.id));
  
      if (updateError) throw updateError;
  
      alert('Donation has been permanently removed.');
      
      // Remove it from the UI
      setDonations(donations.filter(donation => donation.id !== donationId));
    } catch (err) {
      console.error('Error removing donation:', err);
      alert(`Failed to remove donation: ${err.message}`);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time for display
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get expiry warning style
  const getExpiryWarning = (expirationDate) => {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const hoursLeft = (expiry - now) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'text-red-500 font-bold';
    if (hoursLeft < 24) return 'text-orange-500 font-bold';
    if (hoursLeft < 48) return 'text-yellow-600';
    return '';
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0); // Scroll to top when changing pages
  };

  return (
    <div className="bg-white shadow-md rounded px-4 sm:px-8 pt-6 pb-8 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">
          {userType === 'donor' ? 'My Donations' : 'Available Donations'}
        </h2>
        
        {userType === 'recipient' && (
          <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="w-full sm:w-auto">
              <label className="block text-gray-700 text-xs mb-1">Distance</label>
              <select
                className="shadow border rounded py-1 px-2 text-gray-700 text-sm"
                value={searchDistance}
                onChange={(e) => setSearchDistance(parseInt(e.target.value))}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="1000">No Limit</option>
              </select>
            </div>
            
            <div className="w-full sm:w-auto">
              <label className="block text-gray-700 text-xs mb-1">Category</label>
              <select
                className="shadow border rounded py-1 px-2 text-gray-700 text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.entries(foodCategories).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-auto">
              <label className="block text-gray-700 text-xs mb-1">Sort By</label>
              <select
                className="shadow border rounded py-1 px-2 text-gray-700 text-sm"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="expiration_asc">Expiring Soon</option>
                <option value="distance_asc">Closest First</option>
                <option value="created_desc">Newest First</option>
              </select>
            </div>
            
            <button
              onClick={showAllDonations}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded"
            >
              {debug ? "Hide Debug" : "Debug: Show All"}
            </button>
          </div>
        )}
      </div>
      
      {debug && userType === 'recipient' && (
        <div className="bg-purple-100 border border-purple-400 text-purple-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Debug Mode Active</p>
          <p>User ID: {user?.id}</p>
          <p>Location: {userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : 'None'}</p>
          <p>Filter Distance: {searchDistance} km</p>
          <p>Filter Category: {filterCategory || 'None'}</p>
          <p>Sort Option: {sortOption}</p>
          <p>Total Available Donations: {totalCount}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {loading ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">Loading donations...</span>
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">
            {userType === 'donor' 
              ? 'You haven\'t created any donations yet.' 
              : 'No available donations found in your area.'}
          </span>
        </div>
      ) : (
        <div>
          {donations.map(donation => (
            <div key={donation.id} className="border-b py-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Donation Details */}
                <div className="flex-grow">
                  <div className="flex items-center mb-1">
                    <h3 className="font-medium text-gray-800 mr-2">{donation.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadge(donation.status)}`}>
                      {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                    </span>
                  </div>
                  
                  {userType === 'recipient' && donation.users && (
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-semibold">From:</span> {donation.users.organization_name || donation.users.name}
                      {debug && <span className="ml-2 text-xs text-purple-600">ID: {donation.users.id}</span>}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-1">{donation.description}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2">
                    <p className="text-sm">
                      <span className="font-semibold">Quantity:</span> {donation.quantity} {donation.quantity_unit}
                    </p>
                    
                    {donation.food_type && foodCategories[donation.food_type] && (
                      <p className="text-sm">
                        <span className="font-semibold">Category:</span> {foodCategories[donation.food_type]}
                      </p>
                    )}
                    
                    <p className={`text-sm ${getExpiryWarning(donation.expiration_date)}`}>
                      <span className="font-semibold">Expires:</span> {formatDate(donation.expiration_date)}
                    </p>
                    
                    <p className="text-sm">
                      <span className="font-semibold">Pickup:</span> {formatTime(donation.pickup_start_time)} - {formatTime(donation.pickup_end_time)}
                    </p>
                    
                    {userType === 'recipient' && donation.distance !== undefined && (
                      <p className="text-sm">
                        <span className="font-semibold">Distance:</span> {donation.distance} km
                      </p>
                    )}
                    
                    {donation.is_perishable && (
                      <p className="text-sm text-orange-600">
                        Requires refrigeration
                      </p>
                    )}
                    
                    {debug && (
                      <p className="text-xs text-purple-600 col-span-2">
                        <span className="font-semibold">Donation ID:</span> {donation.id}<br/>
                        <span className="font-semibold">Donor ID:</span> {donation.donor_id}<br/>
                        <span className="font-semibold">Location:</span> {donation.pickup_latitude}, {donation.pickup_longitude}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {userType === 'donor' && (
                    <>
                      {/* Edit button (for donor's own donations that are available) */}
                      {donation.status === 'available' && (
                        <button
                          onClick={() => onEditDonation(donation)}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                          Edit
                        </button>
                      )}
                      
                      {/* Cancel button (for donations that are not expired/completed) */}
                      {['available', 'pending'].includes(donation.status) && (
                        <button
                          onClick={() => handleCancelDonation(donation.id)}
                          className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Delete button (only for available donations) */}
                      {donation.status === 'available' && (
                        <button
                          onClick={() => handleDeleteDonation(donation.id)}
                          className="bg-gray-500 hover:bg-gray-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                          Delete
                        </button>
                      )}
                      
                      {/* Show pending requests */}
                      {donation.status === 'pending' && donation.transactions && donation.transactions.some(t => t.status === 'requested') && (
                        <div className="mt-2 border rounded p-2">
                          <h4 className="text-sm font-semibold mb-2">Pending Requests:</h4>
                          {donation.transactions
                            .filter(t => t.status === 'requested')
                            .map(transaction => (
                              <div key={transaction.id} className="mb-2 pb-2 border-b last:border-b-0 last:mb-0 last:pb-0">
                                <p className="text-sm">{transaction.users.organization_name || transaction.users.name}</p>
                                <div className="flex gap-1 mt-1">
                                  <button
                                    onClick={() => handleAcceptRequest(donation.id, transaction.id)}
                                    className="bg-green-500 hover:bg-green-700 text-white text-xs font-bold py-0.5 px-2 rounded"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(donation.id, transaction.id)}
                                    className="bg-gray-500 hover:bg-gray-700 text-white text-xs font-bold py-0.5 px-2 rounded"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Request button (for recipients) */}
                  {userType === 'recipient' && donation.status === 'available' && (
                    <button
                      onClick={() => handleRequestDonation(donation.id)}
                      className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline w-full"
                    >
                      Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          )}
          
          {/* Items count */}
          <div className="text-sm text-gray-500 text-center mt-4">
            Showing {donations.length} of {totalCount} donations
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationsList;