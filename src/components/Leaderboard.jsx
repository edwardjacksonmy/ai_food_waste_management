import { useState, useEffect } from 'react';
import { supabase } from './Auth/AuthContext';

const Leaderboard = () => {
  const [donorRankings, setDonorRankings] = useState([]);
  const [recipientRankings, setRecipientRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('donors');
  const [donorTotalCO2, setDonorTotalCO2] = useState(0);
  const [recipientTotalCO2, setRecipientTotalCO2] = useState(0);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('user_id, name, organization_name, user_type, co2_saved, transaction_count');

      if (error) throw error;

      const donors = [];
      const recipients = [];
      let donorTotal = 0;
      let recipientTotal = 0;

      data.forEach((user) => {
        const entry = {
          id: user.user_id,
          name: user.name,
          organization: user.organization_name || 'Individual',
          co2_saved: parseFloat(user.co2_saved) || 0,
          transaction_count: user.transaction_count || 0,
        };

        if (user.user_type === 'donor') {
          donors.push(entry);
          donorTotal += entry.co2_saved;
        } else if (user.user_type === 'recipient') {
          recipients.push(entry);
          recipientTotal += entry.co2_saved;
        }
      });

      // Sort descending by co2_saved
      donors.sort((a, b) => b.co2_saved - a.co2_saved);
      recipients.sort((a, b) => b.co2_saved - a.co2_saved);

      setDonorRankings(donors);
      setRecipientRankings(recipients);
      setDonorTotalCO2(donorTotal);
      setRecipientTotalCO2(recipientTotal);
    } catch (err) {
      console.error('Error fetching leaderboard:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  const RankingCard = ({ item, index, maxCO2, totalCO2 }) => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 transform transition-all hover:scale-102 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold text-gray-700 w-8 text-center">
            {getMedalEmoji(index)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{item.name || 'Anonymous'}</h3>
            <p className="text-sm text-gray-600">{item.organization}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">
            {item.co2_saved.toFixed(1)} kg
          </div>
          <div className="text-xs text-gray-500">CO₂ Saved</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{
              width: `${maxCO2 > 0 ? Math.min(100, (item.co2_saved / maxCO2) * 100) : 0}%`
            }}
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{item.transaction_count} transactions</span>
          <span>{((item.co2_saved / totalCO2) * 100).toFixed(1)}% of total</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const maxCO2 = activeTab === 'donors' && donorRankings.length > 0
    ? donorRankings[0].co2_saved
    : recipientRankings.length > 0
    ? recipientRankings[0].co2_saved
    : 0;

  const currentTotalCO2 = activeTab === 'donors' ? donorTotalCO2 : recipientTotalCO2;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">Environmental Impact Leaderboard</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Compete to be the top contributor in reducing food waste and CO₂ emissions
        </p>
      </div>

      <div className="mb-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Donors Section */}
            <div className="relative">
              <div className="absolute -top-2 -left-2 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="pl-16">
                <h3 className="text-xl font-bold text-green-800 mb-2">Donors Impact</h3>
                <div className="flex items-baseline space-x-2 mb-4">
                  <p className="text-4xl font-bold text-green-700">{donorTotalCO2.toFixed(1)}</p>
                  <p className="text-lg text-green-600">kg CO₂</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${(donorTotalCO2 / (donorTotalCO2 + recipientTotalCO2)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-700">
                    {((donorTotalCO2 / (donorTotalCO2 + recipientTotalCO2)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">{donorRankings.length} active donors</span>
                </div>
              </div>
            </div>

            {/* Recipients Section */}
            <div className="relative">
              <div className="absolute -top-2 -left-2 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">♻️</span>
              </div>
              <div className="pl-16">
                <h3 className="text-xl font-bold text-blue-800 mb-2">Recipients Impact</h3>
                <div className="flex items-baseline space-x-2 mb-4">
                  <p className="text-4xl font-bold text-blue-700">{recipientTotalCO2.toFixed(1)}</p>
                  <p className="text-lg text-blue-600">kg CO₂</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${(recipientTotalCO2 / (donorTotalCO2 + recipientTotalCO2)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-blue-700">
                    {((recipientTotalCO2 / (donorTotalCO2 + recipientTotalCO2)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">{recipientRankings.length} active recipients</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Impact */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Total Environmental Impact</h4>
              <div className="flex items-center justify-center space-x-2">
                <p className="text-3xl font-bold text-gray-800">{(donorTotalCO2 + recipientTotalCO2).toFixed(1)}</p>
                <p className="text-lg text-gray-600">kg CO₂ Saved</p>
              </div>
              <div className="mt-4 max-w-md mx-auto">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-white shadow-md">
          <button
            onClick={() => setActiveTab('donors')}
            className={`px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'donors'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Top Donors
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            className={`px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'recipients'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Top Recipients
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {(activeTab === 'donors' ? donorRankings : recipientRankings).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg">No {activeTab} rankings available yet</p>
            <p className="text-gray-400 mt-2">Be the first to make an impact!</p>
          </div>
        ) : (
          (activeTab === 'donors' ? donorRankings : recipientRankings).map((item, index) => (
            <div 
              key={item.id || index}
              className="bg-white rounded-xl shadow-md p-6 mb-6 transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-2xl font-bold text-gray-700">
                    {getMedalEmoji(index)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{item.name || 'Anonymous'}</h3>
                    <p className="text-sm text-gray-600">{item.organization}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {item.co2_saved.toFixed(1)} kg
                  </div>
                  <div className="text-xs text-gray-500">CO₂ Saved</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-full rounded-full ${
                      activeTab === 'donors' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${maxCO2 > 0 ? Math.min(100, (item.co2_saved / maxCO2) * 100) : 0}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>{item.transaction_count} transactions</span>
                  <span>{((item.co2_saved / currentTotalCO2) * 100).toFixed(1)}% of total</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 text-center text-sm text-gray-500">
        <p className="mb-2">Rankings are based on total CO₂ emissions saved through food waste reduction</p>
        <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default Leaderboard;
