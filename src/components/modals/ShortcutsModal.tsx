import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + P', action: 'Open Print Dispatch Workstation' },
    { key: 'Ctrl + S', action: 'Save Label Document to Local Storage' },
    { key: 'Ctrl + Z', action: 'Undo Last Action' },
    { key: 'Ctrl + Y', action: 'Redo Last Action' },
    { key: 'Ctrl + D', action: 'Duplicate Selected Object' },
    { key: 'Delete / Backspace', action: 'Remove Selected Object from Canvas' },
    { key: 'Arrow Keys', action: 'Nudge Selected Object by 1.0 mm' },
    { key: 'Shift + Arrow Keys', action: 'Nudge Selected Object by 5.0 mm' },
    { key: 'Ctrl + Click', action: 'Multi-select objects (or toggle selection)' },
    { key: 'Escape', action: 'Deselect current object / Close modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col text-[#c9ccd3] text-xs overflow-hidden">
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm">Keyboard Shortcuts &amp; Ergonomics</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#171920] border border-[#2c303c]">
              <span className="text-gray-300">{s.action}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#252936] text-blue-300 font-mono text-[11px] border border-[#393e4f]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="h-10 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
