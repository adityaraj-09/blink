/**
 * Create Project Modal
 * Create a new project manually without importing from GitHub
 */

import { useState } from 'react';
import { X, Folder, AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { createProject } from '../api/projects';

const CreateProjectModal = ({ isOpen, onClose, onCreateSuccess }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Reset form when modal opens/closes
  const handleClose = () => {
    setProjectName('');
    setDescription('');
    setRepositoryUrl('');
    setError(null);
    setValidationErrors({});
    onClose();
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!projectName.trim()) {
      errors.projectName = 'Project name is required';
    } else if (projectName.trim().length < 3) {
      errors.projectName = 'Project name must be at least 3 characters';
    } else if (projectName.trim().length > 100) {
      errors.projectName = 'Project name must be less than 100 characters';
    }

    if (description && description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (repositoryUrl && !isValidUrl(repositoryUrl)) {
      errors.repositoryUrl = 'Please enter a valid URL';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Simple URL validation
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle form submission
  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const projectData = {
        projectName: projectName.trim(),
        description: description.trim() || undefined,
        repositoryUrl: repositoryUrl.trim() || undefined,
      };

      const project = await createProject(projectData);

      console.log('✅ Project created successfully:', project);

      // Call success callback with project data
      if (onCreateSuccess) {
        onCreateSuccess(project);
      }

      // Close modal
      handleClose();
    } catch (err) {
      console.error('❌ Failed to create project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Folder size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create New Project</h2>
              <p className="text-xs text-gray-400">Start a new project from scratch</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#21262d] rounded-lg transition-colors border border-transparent hover:border-[#30363d]"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Error</p>
                <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (validationErrors.projectName) {
                  setValidationErrors({ ...validationErrors, projectName: null });
                }
              }}
              placeholder="Enter project name"
              className={`w-full px-3 py-2.5 bg-[#0d1117] border ${
                validationErrors.projectName ? 'border-red-500/50' : 'border-[#30363d]'
              } rounded-lg text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-gray-100 placeholder-gray-500`}
              disabled={creating}
            />
            {validationErrors.projectName && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.projectName}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) {
                  setValidationErrors({ ...validationErrors, description: null });
                }
              }}
              placeholder="Enter project description"
              rows={3}
              className={`w-full px-3 py-2.5 bg-[#0d1117] border ${
                validationErrors.description ? 'border-red-500/50' : 'border-[#30363d]'
              } rounded-lg text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-gray-100 placeholder-gray-500 resize-none`}
              disabled={creating}
            />
            <div className="flex items-center justify-between mt-2">
              {validationErrors.description ? (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {validationErrors.description}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Describe what this project is about
                </p>
              )}
              <p className="text-xs text-gray-500">
                {description.length}/500
              </p>
            </div>
          </div>

          {/* Repository URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Repository URL <span className="text-gray-500 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={repositoryUrl}
              onChange={(e) => {
                setRepositoryUrl(e.target.value);
                if (validationErrors.repositoryUrl) {
                  setValidationErrors({ ...validationErrors, repositoryUrl: null });
                }
              }}
              placeholder="https://github.com/username/repo"
              className={`w-full px-3 py-2.5 bg-[#0d1117] border ${
                validationErrors.repositoryUrl ? 'border-red-500/50' : 'border-[#30363d]'
              } rounded-lg text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-gray-100 placeholder-gray-500`}
              disabled={creating}
            />
            {validationErrors.repositoryUrl ? (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.repositoryUrl}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                Link to your repository (GitHub, GitLab, etc.)
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-purple-300 font-medium">
                  What happens next?
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Your project will be created and you can start adding files, managing code, and using AI features.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={creating}
              className="flex-1 px-4 py-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !projectName.trim()}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-white text-sm"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Folder size={16} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
