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
    <div className="flex flex-col h-full bg-[#0a0e1a] border-l border-[#1e293b]">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#0a0e1a]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600/10 rounded-lg">
            <Monitor size={18} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100 font-['ClashDisplay-Variable']">Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#1e293b] rounded-lg transition-all hover:scale-110 text-gray-400 hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Editor Settings */}
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2 font-['DM_Sans']">
            <div className="p-1.5 bg-blue-600/10 rounded-lg">
              <Code size={16} className="text-blue-400" />
            </div>
            Editor
          </h3>

          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-['DM_Sans']">
                Font Size: <span className="text-blue-400 font-medium">{localSettings.fontSize}px</span>
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={localSettings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1 font-['DM_Sans']">
                <span>10px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Tab Size */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-['DM_Sans']">Tab Size</label>
              <div className="flex gap-2">
                {[2, 4, 8].map(size => (
                  <button
                    key={size}
                    onClick={() => handleChange('tabSize', size)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all font-['DM_Sans'] font-medium ${
                      localSettings.tabSize === size
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Wrap */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300 font-['DM_Sans']">Word Wrap</span>
              <button
                onClick={() => handleChange('wordWrap', !localSettings.wordWrap)}
                className={`relative inline-block w-12 h-6 rounded-full transition-all ${
                  localSettings.wordWrap ? 'bg-blue-600 shadow-lg shadow-blue-600/25' : 'bg-[#1e293b]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    localSettings.wordWrap ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300 font-['DM_Sans']">Show Minimap</span>
              <button
                onClick={() => handleChange('minimap', !localSettings.minimap)}
                className={`relative inline-block w-12 h-6 rounded-full transition-all ${
                  localSettings.minimap ? 'bg-blue-600 shadow-lg shadow-blue-600/25' : 'bg-[#1e293b]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    localSettings.minimap ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-300 font-['DM_Sans']">Auto Save</span>
              <button
                onClick={() => handleChange('autoSave', !localSettings.autoSave)}
                className={`relative inline-block w-12 h-6 rounded-full transition-all ${
                  localSettings.autoSave ? 'bg-blue-600 shadow-lg shadow-blue-600/25' : 'bg-[#1e293b]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    localSettings.autoSave ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2 font-['DM_Sans']">
            <div className="p-1.5 bg-purple-600/10 rounded-lg">
              <Monitor size={16} className="text-purple-400" />
            </div>
            Appearance
          </h3>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-['DM_Sans']">Editor Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'vs-dark', label: 'Dark', icon: Moon },
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'hc-black', label: 'High Contrast', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleChange('theme', value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all font-['DM_Sans'] ${
                      localSettings.theme === value
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm text-gray-300 mb-2 font-['DM_Sans']">
                Line Height: <span className="text-purple-400 font-medium">{localSettings.lineHeight}</span>
              </label>
              <input
                type="range"
                min="1"
                max="2"
                step="0.1"
                value={localSettings.lineHeight}
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-[#020617] border border-[#1e293b] rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2 font-['DM_Sans']">
            <div className="p-1.5 bg-green-600/10 rounded-lg">
              <Type size={16} className="text-green-400" />
            </div>
            Keyboard Shortcuts
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">Search Files</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Ctrl+P</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">Save File</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Cmd+S</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">AI Inline Edit</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Cmd+K</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">AI Assistant</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Ctrl+I</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">Git Panel</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Ctrl+G</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">Terminal</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">Ctrl+`</kbd>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-all">
              <span className="text-gray-300 font-['DM_Sans']">Fullscreen</span>
              <kbd className="px-2.5 py-1 bg-[#020617] border border-[#334155] rounded text-xs text-blue-400 font-['DM_Sans'] font-medium">F11</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e293b] text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-['DM_Sans']">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Settings saved automatically</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
