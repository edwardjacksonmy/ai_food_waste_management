// src/components/FoodDonationForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from './Auth/AuthContext';

const FoodDonationForm = ({ onDonationAdded, donationToEdit, onCancelEdit }) => {
  const { user } = useAuth();
  const [foodCategories, setFoodCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [location, setLocation] = useState({
    address: '',
    latitude: null,
    longitude: null
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    foodType: '',
    quantity: '',
    quantityUnit: 'kg',
    preparedDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    pickupStartTime: '',
    pickupEndTime: '',
    isPerishable: true,
    storageRequirements: ''
  });

  // Fetch food categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('food_categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        setFoodCategories(data || []);
      } catch (err) {
        console.error('Error fetching food categories:', err);
        setError('Failed to load food categories');
      }
    };

    fetchCategories();

    // If editing an existing donation
    if (donationToEdit) {
      const pickupStartTime = new Date(donationToEdit.pickup_start_time)
        .toISOString().split('T')[1].substring(0, 5);
      const pickupEndTime = new Date(donationToEdit.pickup_end_time)
        .toISOString().split('T')[1].substring(0, 5);
      
      setFormData({
        title: donationToEdit.title,
        description: donationToEdit.description || '',
        foodType: donationToEdit.food_type || '',
        quantity: donationToEdit.quantity,
        quantityUnit: donationToEdit.quantity_unit,
        preparedDate: new Date(donationToEdit.prepared_date).toISOString().split('T')[0],
        expirationDate: new Date(donationToEdit.expiration_date).toISOString().split('T')[0],
        pickupStartTime,
        pickupEndTime,
        isPerishable: donationToEdit.is_perishable,
        storageRequirements: donationToEdit.storage_requirements || ''
      });

      setUseCurrentLocation(!donationToEdit.is_different_location);
      setLocation({
        address: donationToEdit.pickup_address || '',
        latitude: donationToEdit.pickup_latitude,
        longitude: donationToEdit.pickup_longitude
      });
    }
  }, [donationToEdit]);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            ...location,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Could not get your current location. Please enter address manually.");
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Please enter address manually.");
      setUseCurrentLocation(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to create a donation");
      return;
    }

    // Validate form
    if (!formData.title || !formData.quantity || !formData.expirationDate || 
        !formData.pickupStartTime || !formData.pickupEndTime) {
      setError("Please fill in all required fields");
      return;
    }

    // Check if we have location data
    if (!useCurrentLocation && (!location.address || !location.latitude || !location.longitude)) {
      setError("Please provide a pickup location");
      return;
    }

    setLoading(true);
    setError(null);

    // Prepare the date/time fields
    const pickupStartDate = new Date(formData.expirationDate);
    const [startHours, startMinutes] = formData.pickupStartTime.split(':');
    pickupStartDate.setHours(startHours, startMinutes);

    const pickupEndDate = new Date(formData.expirationDate);
    const [endHours, endMinutes] = formData.pickupEndTime.split(':');
    pickupEndDate.setHours(endHours, endMinutes);

    try {
      let userLocation;
      if (useCurrentLocation) {
        // Get user's registered location
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('address, location_latitude, location_longitude')
          .eq('id', user.id)
          .single();
        
        if (userError) throw userError;
        
        userLocation = {
          address: userData.address,
          latitude: userData.location_latitude,
          longitude: userData.location_longitude
        };
      } else {
        userLocation = location;
      }

      const donationData = {
        title: formData.title,
        description: formData.description,
        food_type: formData.foodType || null,
        quantity: parseFloat(formData.quantity),
        quantity_unit: formData.quantityUnit,
        prepared_date: formData.preparedDate ? new Date(formData.preparedDate).toISOString() : null,
        expiration_date: new Date(formData.expirationDate).toISOString(),
        pickup_address: userLocation.address,
        pickup_latitude: userLocation.latitude,
        pickup_longitude: userLocation.longitude,
        is_different_location: !useCurrentLocation,
        pickup_start_time: pickupStartDate.toISOString(),
        pickup_end_time: pickupEndDate.toISOString(),
        is_perishable: formData.isPerishable,
        storage_requirements: formData.storageRequirements,
        donor_id: user.id,
        status: 'available'
      };

      let result;
      if (donationToEdit) {
        // Update existing donation
        const { data, error } = await supabase
          .from('food_donations')
          .update(donationData)
          .eq('id', donationToEdit.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Insert new donation
        const { data, error } = await supabase
          .from('food_donations')
          .insert(donationData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        foodType: '',
        quantity: '',
        quantityUnit: 'kg',
        preparedDate: new Date().toISOString().split('T')[0],
        expirationDate: '',
        pickupStartTime: '',
        pickupEndTime: '',
        isPerishable: true,
        storageRequirements: ''
      });

      // Notify parent component
      onDonationAdded(result);
    } catch (err) {
      console.error('Error creating donation:', err);
      setError(`Failed to ${donationToEdit ? 'update' : 'create'} food donation. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle location toggle
  const handleLocationToggle = (e) => {
    const useDefault = e.target.checked;
    setUseCurrentLocation(useDefault);
    
    if (useDefault) {
      // Clear manual location fields
      setLocation({
        address: '',
        latitude: null,
        longitude: null
      });
    } else {
      // Use geocoding service or prompt user to enter coordinates
      getCurrentLocation();
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-4 sm:px-8 pt-6 pb-8 mb-4">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">
        {donationToEdit ? 'Edit Food Donation' : 'Create New Food Donation'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
            Title *
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="title"
            type="text"
            name="title"
            placeholder="E.g., Fresh Vegetables from Restaurant"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="description"
            name="description"
            placeholder="Describe the food you're donating"
            value={formData.description}
            onChange={handleChange}
            rows="3"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="foodType">
              Food Category
            </label>
            <select
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="foodType"
              name="foodType"
              value={formData.foodType}
              onChange={handleChange}
            >
              <option value="">-- Select Category --</option>
              {foodCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-4 flex">
            <div className="w-2/3 pr-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantity">
                Quantity *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                name="quantity"
                placeholder="Amount"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>
            <div className="w-1/3">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantityUnit">
                Unit
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="quantityUnit"
                name="quantityUnit"
                value={formData.quantityUnit}
                onChange={handleChange}
              >
                <option value="kg">kg</option>
                <option value="items">items</option>
                <option value="servings">servings</option>
                <option value="portions">portions</option>
                <option value="packages">packages</option>
                <option value="liters">liters</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Dates and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preparedDate">
              Prepared Date
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="preparedDate"
              type="date"
              name="preparedDate"
              value={formData.preparedDate}
              onChange={handleChange}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expirationDate">
              Expiration Date *
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="expirationDate"
              type="date"
              name="expirationDate"
              value={formData.expirationDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="pickupStartTime">
              Pickup Available From *
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="pickupStartTime"
              type="time"
              name="pickupStartTime"
              value={formData.pickupStartTime}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="pickupEndTime">
              Pickup Available Until *
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="pickupEndTime"
              type="time"
              name="pickupEndTime"
              value={formData.pickupEndTime}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        {/* Additional Details */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isPerishable"
              checked={formData.isPerishable}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-700 text-sm">This is perishable food (requires refrigeration)</span>
          </label>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="storageRequirements">
            Storage Requirements
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="storageRequirements"
            name="storageRequirements"
            placeholder="e.g., Keep refrigerated, Store in a cool place"
            value={formData.storageRequirements}
            onChange={handleChange}
            rows="2"
          />
        </div>
        
        {/* Location Information */}
        <div className="mb-6 border-t pt-4">
          <h3 className="text-md font-semibold mb-2">Pickup Location</h3>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useCurrentLocation}
                onChange={handleLocationToggle}
                className="mr-2"
              />
              <span className="text-gray-700 text-sm">Use my registered address</span>
            </label>
          </div>
          
          {!useCurrentLocation && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                  Pickup Address
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="address"
                  type="text"
                  placeholder="Enter pickup address"
                  value={location.address}
                  onChange={(e) => setLocation({ ...location, address: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="latitude">
                    Latitude
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="latitude"
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={location.latitude || ''}
                    onChange={(e) => setLocation({ ...location, latitude: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="longitude">
                    Longitude
                  </label>
                  <input
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    id="longitude"
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={location.longitude || ''}
                    onChange={(e) => setLocation({ ...location, longitude: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Get Current Location
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full sm:w-auto"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Processing...' : (donationToEdit ? 'Update Donation' : 'Create Donation')}
          </button>
          
          {donationToEdit && (
            <button
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2 sm:mt-0 w-full sm:w-auto"
              type="button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FoodDonationForm;