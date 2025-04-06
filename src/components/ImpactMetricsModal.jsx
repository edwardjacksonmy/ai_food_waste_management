// src/components/ImpactMetricsModal.jsx
import React from 'react';

const ImpactMetricsModal = ({ isOpen, onClose, metrics }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Environmental Impact</h2>
        
        {metrics ? (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-green-600">{metrics.food_weight.toFixed(1)} kg</div>
                <div className="text-sm text-gray-600">Food Rescued</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-blue-600">{metrics.co2_saved.toFixed(1)} kg</div>
                <div className="text-sm text-gray-600">CO₂ Saved</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-purple-600">{metrics.meals_provided}</div>
                <div className="text-sm text-gray-600">Meals Provided</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-yellow-600">RM {metrics.estimated_value ? metrics.estimated_value.toFixed(2) : '0.00'}</div>
                <div className="text-sm text-gray-600">Estimated Value</div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              By rescuing this food, you've helped reduce waste and its environmental impact.
            </p>
          </div>
        ) : (
          <p>No impact metrics available for this transaction.</p>
        )}
        
        <button
          onClick={onClose}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ImpactMetricsModal;