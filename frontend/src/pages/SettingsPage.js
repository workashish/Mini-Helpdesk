import React from 'react';

const SettingsPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage application settings and preferences
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Settings Page Coming Soon
        </h3>
        <p className="text-blue-700">
          Application settings, notification preferences, and system configuration options 
          will be available in a future update.
        </p>
      </div>

      {/* Placeholder Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          General Settings (Preview)
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-600">Receive email updates for ticket activity</p>
            </div>
            <input type="checkbox" disabled className="rounded" />
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Dark Mode</p>
              <p className="text-sm text-gray-600">Switch to dark theme</p>
            </div>
            <input type="checkbox" disabled className="rounded" />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Auto-refresh</p>
              <p className="text-sm text-gray-600">Automatically refresh ticket lists</p>
            </div>
            <input type="checkbox" disabled className="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;