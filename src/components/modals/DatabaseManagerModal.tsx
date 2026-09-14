import React, { useState } from 'react';
import {
  X,
  Database,
  Upload,
  Plus,
  Table,
  Sliders,
  CheckCircle,
  FileSpreadsheet,
  FileCode,
  Hash,
  ArrowRight
} from 'lucide-react';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSources: DataSourceDefinition[];
  activeDataSourceId: string;
  onSelectDataSource: (id: string) => void;
  onAddCustomDataSource: (ds: DataSourceDefinition) => void;
  counter: SerializationCounter;
  onUpdateCounter: (c: SerializationCounter) => void;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
  dataSources,
  activeDataSourceId,
  onSelectDataSource,
  onAddCustomDataSource,
  counter,
  onUpdateCounter,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'sources' | 'import' | 'serialization'>('sources');

  // Custom CSV import state
  const [customName, setCustomName] = useState('Imported Batch Data');
  const [csvText, setCsvText] = useState(
    `SKU,Product_Name,Lot_Number,Quantity,Destination\nSKU-9901,Industrial Valve 4in,LOT-2026-A1,50,Chicago DC\nSKU-9902,Pressure Gauge 100PSI,LOT-2026-A2,120,Dallas Hub\nSKU-9903,Stainless Flange 6in,LOT-2026-A3,75,Rotterdam Port`
  );
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const activeDS = dataSources.find(d => d.id === activeDataSourceId) || dataSources[0];

  const handleParseAndAddCsv = () => {
    try {
      const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        setImportFeedback('Error: CSV must contain at least a header row and one data row.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const records = lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, string> = { id: `rec-${idx + 1}` };
        headers.forEach((h, hIdx) => {
          row[h] = values[hIdx] || '';
        });
        return row;
      });

      const newDS: DataSourceDefinition = {
        id: `custom-ds-${Date.now()}`,
        name: customName,
        type: 'csv',
        status: 'CONNECTED',
        fields: headers.map(h => ({ name: h, type: 'string', sample: records[0]?.[h] || '' })),
        records,
        currentRecordIndex: 0,
        totalRecords: records.length,
      };

      onAddCustomDataSource(newDS);
      onSelectDataSource(newDS.id);
      setImportFeedback(`Successfully imported ${records.length} records with ${headers.length} fields!`);
      setTimeout(() => {
        setActiveTab('sources');
        setImportFeedback(null);
      }, 1200);
    } catch (err: any) {
      setImportFeedback(`Failed to parse CSV: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">Database Connectivity &amp; Serialization Manager</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="bg-[#1c1f26] border-b border-[#303440] px-4 flex space-x-4 font-medium">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'sources' ? 'text-white border-cyan-500 font-semibold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connected Data Sources ({dataSources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'import' ? 'text-white border-blue-500 font-semibold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import CSV / JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('serialization')}
            className={`py-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'serialization' ? 'text-white border-amber-500 font-semibold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-amber-400" />
            <span>Serialization Counters</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* TAB 1: CONNECTED SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {dataSources.map((ds) => {
                  const isActive = ds.id === activeDataSourceId;
                  return (
                    <div
                      key={ds.id}
                      onClick={() => onSelectDataSource(ds.id)}
                      className={`p-3 rounded border cursor-pointer transition-all ${
                        isActive
                          ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-lg'
                          : 'bg-[#181a21] border-[#2c303c] text-gray-300 hover:bg-[#20232c]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{ds.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
                          {ds.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Type: <span className="uppercase text-cyan-300 font-mono">{ds.type}</span> • {ds.records.length} records
                      </div>
                      <div className="text-[9px] text-gray-500 mt-2 truncate">
                        Fields: {ds.fields.map(f => f.name).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Record Preview of Active Data Source */}
              {activeDS && (
                <div className="space-y-2 border-t border-[#2d313d] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      Active Source Preview: {activeDS.name}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {activeDS.records.length} total rows
                    </span>
                  </div>

                  <div className="max-h-56 overflow-auto border border-[#2d313d] rounded bg-[#16181f]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#20232d] text-cyan-300 border-b border-[#2d313d] font-mono text-[11px]">
                          <th className="p-2">#</th>
                          {activeDS.fields.map(f => (
                            <th key={f.name} className="p-2">{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeDS.records.map((r, idx) => (
                          <tr key={idx} className="border-b border-[#242733] hover:bg-[#222530] text-gray-300">
                            <td className="p-2 font-mono text-gray-500">{idx + 1}</td>
                            {activeDS.fields.map(f => (
                              <td key={f.name} className="p-2 font-mono text-[11px] truncate max-w-[180px]">
                                {r[f.name] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT CSV */}
          {activeTab === 'import' && (
            <div className="space-y-3">
              <div className="bg-[#171920] p-3 rounded border border-[#2d313d] space-y-2">
                <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Paste or Upload CSV / Tab-Delimited Data</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Headers in the first row will automatically register as dynamic binding fields available for barcodes and label text.
                </p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Data Source Display Name:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Raw CSV Content:
                </label>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full bg-[#15171e] border border-[#353a47] rounded p-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {importFeedback && (
                <div className="p-2 rounded bg-cyan-950 border border-cyan-800 text-cyan-200 text-xs">
                  {importFeedback}
                </div>
              )}

              <button
                onClick={handleParseAndAddCsv}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5"
              >
                <span>Parse &amp; Connect Data Source</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 3: SERIALIZATION */}
          {activeTab === 'serialization' && (
            <div className="space-y-4 max-w-xl">
              <div className="bg-[#171920] p-3 rounded border border-[#2d313d] space-y-1">
                <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <Hash className="w-4 h-4 text-amber-400" />
                  <span>Sequential Serialization Counter Configuration</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Bind this counter to any barcode or text field via token <code className="text-amber-300">{'{{SERIAL}}'}</code>. The engine automatically increments the counter with every printed label.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Counter Name</label>
                  <input
                    type="text"
                    value={counter.name}
                    onChange={(e) => onUpdateCounter({ ...counter, name: e.target.value })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Prefix</label>
                  <input
                    type="text"
                    value={counter.prefix}
                    onChange={(e) => onUpdateCounter({ ...counter, prefix: e.target.value })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Current Value</label>
                  <input
                    type="number"
                    value={counter.currentValue}
                    onChange={(e) => onUpdateCounter({ ...counter, currentValue: Number(e.target.value) })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Step Increment</label>
                  <input
                    type="number"
                    value={counter.step}
                    onChange={(e) => onUpdateCounter({ ...counter, step: Number(e.target.value) })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Minimum Digits (Zero Padding)</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={counter.padding}
                    onChange={(e) => onUpdateCounter({ ...counter, padding: Number(e.target.value) })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Suffix</label>
                  <input
                    type="text"
                    value={counter.suffix}
                    onChange={(e) => onUpdateCounter({ ...counter, suffix: e.target.value })}
                    className="w-full bg-[#15171e] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Formatted Preview */}
              <div className="p-3 rounded bg-amber-950/40 border border-amber-800/50 text-amber-200">
                <div className="text-[10px] uppercase font-bold text-amber-400">Next Serialized Output:</div>
                <div className="font-mono text-base font-bold text-white mt-0.5">
                  {counter.prefix}{String(counter.currentValue).padStart(counter.padding, '0')}{counter.suffix}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-10 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
