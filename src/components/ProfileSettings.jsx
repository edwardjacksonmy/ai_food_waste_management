import React, { useState } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';

const ProfileSettings = ({ profile }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    organization_name: profile?.organization_name || '',
    phone_number: profile?.phone_number || '',
    address: profile?.address || '',
    location_latitude: profile?.location_latitude || '',
    location_longitude: profile?.location_longitude || ''
  });
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage('');
    
    // Check required fields
    const requiredFields = ['name', 'phone_number', 'address'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setFormError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      // Update profile
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          organization_name: formData.organization_name,
          phone_number: formData.phone_number,
          address: formData.address,
          location_latitude: formData.location_latitude || null,
          location_longitude: formData.location_longitude || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setFormError(`Failed to update profile: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h1 className="text-2xl font-bold mb-4">Profile Settings</h1>
        
        {formError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{formError}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Success: </strong>
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name *
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
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
              name="organization_name"
              type="text"
              value={formData.organization_name}
              onChange={handleChange}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone_number">
              Phone Number *
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
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
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Location
            </label>
            <div className="flex flex-col sm:flex-row sm:space-x-4">
              <div className="flex-grow">
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="location_latitude"
                  name="location_latitude"
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={formData.location_latitude}
                  onChange={handleChange}
                />
              </div>
              <div className="flex-grow">
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="location_longitude"
                  name="location_longitude"
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={formData.location_longitude}
                  onChange={handleChange}
                />
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Get Current Location
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings; 