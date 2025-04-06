// src/components/FoodWasteApp.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Leaderboard from './Leaderboard';
import FoodDonationForm from './FoodDonationForm';
import TransactionsList from './TransactionsList';
import ProfileSettings from './ProfileSettings';

const FoodWasteApp = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    organization_name: '',
    phone_number: '',
    address: '',
    user_type: 'recipient',
    location_latitude: '',
    location_longitude: ''
  });
  const [formError, setFormError] = useState(null);

  // Check URL parameters for active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Check if user has a profile
  useEffect(() => {
    const fetchUserProfile = async () => {
        if (!user) return;
        
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              // No profile found, need to create one
              setIsProfileComplete(false);
              setIsCreatingProfile(true);
            } else {
              throw error;
            }
          } else if (data) {
            // Check if name is missing
            if (!data.name) {
              console.log("Profile exists but name is missing");
              setIsProfileComplete(false);
              setIsCreatingProfile(true);
              
              // Pre-fill form with existing data
              setProfileFormData({
                name: '',
                organization_name: data.organization_name || '',
                phone_number: data.phone_number || '',
                address: data.address || '',
                user_type: data.user_type || 'recipient',
                location_latitude: data.location_latitude || '',
                location_longitude: data.location_longitude || ''
              });
            } else {
              setProfile(data);
              
              // Check if profile is complete
              const requiredFields = ['name', 'phone_number', 'address', 'user_type'];
              const isComplete = requiredFields.every(field => data[field]);
              
              setIsProfileComplete(isComplete);
              setIsCreatingProfile(!isComplete);
              
              // Pre-fill form data
              setProfileFormData({
                name: data.name || '',
                organization_name: data.organization_name || '',
                phone_number: data.phone_number || '',
                address: data.address || '',
                user_type: data.user_type || 'recipient',
                location_latitude: data.location_latitude || '',
                location_longitude: data.location_longitude || ''
              });
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setFormError('Failed to load user profile');
        }
      };

    fetchUserProfile();
  }, [user]);

  // Handle form input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData({
      ...profileFormData,
      [name]: value
    });
  };

  // Handle user type change
  const handleUserTypeChange = (type) => {
    setProfileFormData({
      ...profileFormData,
      user_type: type
    });
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProfileFormData({
            ...profileFormData,
            location_latitude: position.coords.latitude,
            location_longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setFormError("Could not get your current location. Please enter coordinates manually.");
        }
      );
    } else {
      setFormError("Geolocation is not supported by your browser. Please enter coordinates manually.");
    }
  };

  // Handle form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    // Check required fields
    const requiredFields = ['name', 'phone_number', 'address', 'user_type'];
    const missingFields = requiredFields.filter(field => !profileFormData[field]);
    
    if (missingFields.length > 0) {
      setFormError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      let query;
      
      if (profile) {
        // Update existing profile
        query = supabase
          .from('users')
          .update({
            name: profileFormData.name,
            organization_name: profileFormData.organization_name,
            phone_number: profileFormData.phone_number,
            address: profileFormData.address,
            user_type: profileFormData.user_type,
            location_latitude: profileFormData.location_latitude || null,
            location_longitude: profileFormData.location_longitude || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } else {
        // Create new profile
        query = supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: profileFormData.name,
            organization_name: profileFormData.organization_name,
            phone_number: profileFormData.phone_number,
            address: profileFormData.address,
            user_type: profileFormData.user_type,
            location_latitude: profileFormData.location_latitude || null,
            location_longitude: profileFormData.location_longitude || null
          });
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      // Create or update user preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_settings: { email: true, sms: true, push: false },
          ...(profileFormData.user_type === 'recipient' 
            ? { preferred_pickup_distance: 10 } 
            : {})
        });
      
      // Update profile state
      setProfile({
        ...profileFormData,
        id: user.id,
        email: user.email
      });
      
      setIsProfileComplete(true);
      setIsCreatingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setFormError(`Failed to save profile: ${err.message}`);
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'create':
        return <FoodDonationForm />;
      case 'transactions':
        return <TransactionsList />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'profile':
        return <ProfileSettings profile={profile} />;
      default:
        return <Dashboard />;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Food Waste Management System</h1>
          <p className="mb-4">Please sign in to access the system</p>
        </div>
      </div>
    );
  }

  // Create/complete profile
  if (isCreatingProfile) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h1 className="text-2xl font-bold mb-4">
            {profile ? 'Complete Your Profile' : 'Create Your Profile'}
          </h1>
          
          {formError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{formError}</span>
            </div>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            {/* User Type Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                I am a:
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-4">
                <button
                  type="button"
                  className={`p-4 border rounded mb-2 sm:mb-0 flex items-center ${
                    profileFormData.user_type === 'donor'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  onClick={() => handleUserTypeChange('donor')}
                >
                  <div className="flex-1">
                    <div className="font-semibold">Food Donor</div>
                    <div className="text-sm text-gray-600">
                      I have food to donate
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  className={`p-4 border rounded flex items-center ${
                    profileFormData.user_type === 'recipient'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  onClick={() => handleUserTypeChange('recipient')}
                >
                  <div className="flex-1">
                    <div className="font-semibold">Food Recipient</div>
                    <div className="text-sm text-gray-600">
                      I need food donations
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Basic Info */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Your Name / Contact Person *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={profileFormData.name}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="organization_name">
                Organization Name
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="organization_name"
                type="text"
                name="organization_name"
                placeholder="Company or organization name (if applicable)"
                value={profileFormData.organization_name}
                onChange={handleProfileChange}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone_number">
                Phone Number *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="phone_number"
                type="tel"
                name="phone_number"
                placeholder="Enter your phone number"
                value={profileFormData.phone_number}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Address *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="address"
                type="text"
                name="address"
                placeholder="Enter your full address"
                value={profileFormData.address}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            {/* Location Information */}
            <div className="mb-6 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Location Coordinates</h3>
              <p className="text-sm text-gray-600 mb-2">
                This helps calculate distances for food pickup and delivery.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location_latitude">
                    Latitude
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="location_latitude"
                    type="number"
                    step="0.000001"
                    name="location_latitude"
                    placeholder="Latitude"
                    value={profileFormData.location_latitude}
                    onChange={handleProfileChange}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location_longitude">
                    Longitude
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="location_longitude"
                    type="number"
                    step="0.000001"
                    name="location_longitude"
                    placeholder="Longitude"
                    value={profileFormData.location_longitude}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={getCurrentLocation}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Get Current Location
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
              >
                {profile ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow">
      {renderContent()}
    </div>
  );
};

export default FoodWasteApp;