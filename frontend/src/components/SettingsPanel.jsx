import { useState } from 'react';
import { X, Monitor, Moon, Sun, Type, Code, Maximize2 } from 'lucide-react';

const SettingsPanel = ({ onClose, settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-[#2d2d2d]">
      {/* Header */}
      <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
        <h2 className="text-lg font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Editor Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Code size={16} />
            Editor
          </h3>

          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Font Size: {localSettings.fontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={localSettings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>10px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Tab Size */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tab Size</label>
              <div className="flex gap-2">
                {[2, 4, 8].map(size => (
                  <button
                    key={size}
                    onClick={() => handleChange('tabSize', size)}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      localSettings.tabSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0e0e0e] text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Wrap */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Word Wrap</span>
              <button
                onClick={() => handleChange('wordWrap', !localSettings.wordWrap)}
                className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                  localSettings.wordWrap ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.wordWrap ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Show Minimap</span>
              <button
                onClick={() => handleChange('minimap', !localSettings.minimap)}
                className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                  localSettings.minimap ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.minimap ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Auto Save</span>
              <button
                onClick={() => handleChange('autoSave', !localSettings.autoSave)}
                className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                  localSettings.autoSave ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.autoSave ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Monitor size={16} />
            Appearance
          </h3>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Editor Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'vs-dark', label: 'Dark', icon: Moon },
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'hc-black', label: 'High Contrast', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleChange('theme', value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded transition-colors ${
                      localSettings.theme === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0e0e0e] text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Line Height: {localSettings.lineHeight}
              </label>
              <input
                type="range"
                min="1"
                max="2"
                step="0.1"
                value={localSettings.lineHeight}
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Type size={16} />
            Keyboard Shortcuts
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-[#0e0e0e] rounded">
              <span className="text-gray-400">Quick Open</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+P</kbd>
            </div>
            <div className="flex justify-between p-2 bg-[#0e0e0e] rounded">
              <span className="text-gray-400">Save File</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+S</kbd>
            </div>
            <div className="flex justify-between p-2 bg-[#0e0e0e] rounded">
              <span className="text-gray-400">Fullscreen</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">F11</kbd>
            </div>
            <div className="flex justify-between p-2 bg-[#0e0e0e] rounded">
              <span className="text-gray-400">Toggle Terminal</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+`</kbd>
            </div>
            <div className="flex justify-between p-2 bg-[#0e0e0e] rounded">
              <span className="text-gray-400">Toggle Git</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+Shift+G</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2d2d2d] text-center text-xs text-gray-500">
        Settings are saved automatically
      </div>
    </div>
  );
};

export default SettingsPanel;
