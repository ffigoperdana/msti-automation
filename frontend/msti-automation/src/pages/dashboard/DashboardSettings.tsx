import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import metricService from '../../services/metricService';

interface DashboardFormData {
  name: string;
  description: string;
  tags: string[];
}

const DashboardSettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DashboardFormData>({
    name: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsFetching(true);
        const dashboard = await metricService.getDashboard(id!);
        setFormData({
          name: dashboard.name || '',
          description: dashboard.description || '',
          tags: dashboard.tags || []
        });
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard');
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      fetchDashboard();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Dashboard name is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await metricService.updateDashboard(id!, {
        name: formData.name,
        description: formData.description,
        tags: formData.tags
      });

      // Navigate back to dashboard view
      navigate(`/dashboard/view/${id}`);
    } catch (err) {
      console.error('Error updating dashboard:', err);
      setError('Failed to update dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/dashboard/view/${id}`);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard Settings</h1>
        <p className="mt-2 text-gray-600">Edit dashboard name, description, and tags</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Dashboard Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Dashboard Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter dashboard name"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter dashboard description"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
          </div>
          
          {/* Display Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DashboardSettings;
