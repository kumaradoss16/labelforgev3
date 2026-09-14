import React, { useState } from 'react';
import {
  X,
  Workflow,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderSync,
  FileSpreadsheet,
  ShieldCheck,
  Printer,
  Archive,
  Terminal
} from 'lucide-react';
import { AutomationWorkflow, WorkflowExecutionLog } from '../../types/workflow';
import { SAMPLE_WORKFLOW } from '../../services/sampleData';

interface WorkflowDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowDesignerModal: React.FC<WorkflowDesignerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [workflow, setWorkflow] = useState<AutomationWorkflow>(SAMPLE_WORKFLOW);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<WorkflowExecutionLog[]>([
    {
      id: 'log-1',
      timestamp: '10:04:12',
      level: 'INFO',
      message: 'Workflow engine initialized. Polling hot folder at 5000ms interval.',
    },
    {
      id: 'log-2',
      timestamp: '10:04:15',
      level: 'INFO',
      message: 'Preflight rule check passed: GS1 GTIN Modulo-10 verified.',
    },
  ]);

  const handleSimulateBatch = () => {
    setIsRunning(true);
    setActiveStepIndex(0);

    const stepMessages = [
      'Hot folder event detected: Inbound file "batch_order_88192.csv" arrived.',
      'CSV schema parser mapped 25 records to GS1-128 shipping template.',
      'Preflight safety gate evaluated: 0 boundary overflows, 0 check digit errors.',
      'ZPL compiler generated 25 native packets. Dispatched to Zebra ZT410 (192.168.1.120:9100).',
      'Batch completed in 1.42s. Audit archive saved to /logs/archive_88192.json.',
    ];

    stepMessages.forEach((msg, idx) => {
      setTimeout(() => {
        setActiveStepIndex(idx);
        setLogs(prev => [
          ...prev,
          {
            id: `log-${Date.now()}-${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'INFO',
            message: msg,
          },
        ]);

        if (idx === stepMessages.length - 1) {
          setIsRunning(false);
          setActiveStepIndex(null);
        }
      }, (idx + 1) * 700);
    });
  };

  const pipelineNodes = [
    { title: 'Hot Folder Watcher', desc: 'Watches /inbound/*.csv', icon: FolderSync },
    { title: 'Data Transformer', desc: 'Maps CSV to Label Schema', icon: FileSpreadsheet },
    { title: 'Preflight Quality Gate', desc: 'Validates GS1 & Boundaries', icon: ShieldCheck },
    { title: 'Thermal Spooler', desc: 'Zebra ZT410 (TCP 9100)', icon: Printer },
    { title: 'Audit Archiver', desc: 'JSON Log & Webhook', icon: Archive },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Workflow className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">Enterprise Print Automation Pipeline Designer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-[#1a1c24]">
          {/* Top Info Banner & Action Button */}
          <div className="flex items-center justify-between bg-[#15171e] p-3 rounded border border-[#2d313d]">
            <div>
              <div className="font-bold text-white text-sm">{workflow.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{workflow.description}</div>
            </div>
            <button
              disabled={isRunning}
              onClick={handleSimulateBatch}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isRunning ? 'Processing Batch...' : 'Simulate Hot-Folder Drop'}</span>
            </button>
          </div>

          {/* Visual Node Graph */}
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">
              Visual Execution Pipeline
            </span>
            <div className="grid grid-cols-5 gap-2">
              {pipelineNodes.map((node, idx) => {
                const isCurrent = activeStepIndex === idx;
                const isPassed = activeStepIndex !== null && activeStepIndex > idx;
                const IconComponent = node.icon;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded border flex flex-col items-center text-center transition-all ${
                      isCurrent
                        ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400'
                        : isPassed
                        ? 'bg-[#14261d] border-emerald-800 text-emerald-200'
                        : 'bg-[#16181f] border-[#2c303c] text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${
                        isCurrent
                          ? 'bg-cyan-600 text-white animate-bounce'
                          : isPassed
                          ? 'bg-emerald-700 text-white'
                          : 'bg-[#222530] text-gray-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[11px] text-gray-200">{node.title}</span>
                    <span className="text-[9px] text-gray-500 mt-1">{node.desc}</span>
                    <div className="mt-2 text-[9px] font-mono">
                      {isCurrent ? (
                        <span className="text-cyan-400 font-bold animate-pulse">PROCESSING</span>
                      ) : isPassed ? (
                        <span className="text-emerald-400">PASSED</span>
                      ) : (
                        <span className="text-gray-600">STANDBY</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline Execution Terminal Logs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Automation Service Logs</span>
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-gray-500 hover:text-gray-300"
              >
                Clear Log
              </button>
            </div>

            <div className="bg-[#12141a] border border-[#272a35] rounded p-3 font-mono text-[11px] text-gray-300 h-40 overflow-y-auto space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
                  <span className="text-cyan-400 font-bold shrink-0">[{log.level}]</span>
                  <span className="text-gray-200">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">
            Enterprise Windows Service / Headless Daemon Compliant
          </div>
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
