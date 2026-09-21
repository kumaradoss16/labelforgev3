import React from 'react';
import { PrintJob } from '../../types/printer';
import { LabelDocument } from '../../types/label';
import { SAMPLE_TEMPLATES } from '../../services/sampleData';

interface JobLabelThumbnailProps {
  job: PrintJob;
  activeDocument?: LabelDocument;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const JobLabelThumbnail: React.FC<JobLabelThumbnailProps> = ({
  job,
  activeDocument,
  size = 'sm',
  className = ''
}) => {
  // 1. Resolve matching document if available
  const matchedTemplate: LabelDocument | undefined =
    (activeDocument && (activeDocument.id === job.templateId || activeDocument.name === job.templateName))
      ? activeDocument
      : SAMPLE_TEMPLATES.find(
          t => t.id === job.templateId || t.name === job.templateName
        );

  const isPallet = job.templateId?.includes('pallet') || job.jobName.toLowerCase().includes('pallet');
  const isPharma = job.templateId?.includes('pharma') || job.jobName.toLowerCase().includes('pharma') || job.jobName.toLowerCase().includes('vial');
  const isGhs = job.templateId?.includes('chemical') || job.templateId?.includes('ghs') || job.jobName.toLowerCase().includes('hazard') || job.jobName.toLowerCase().includes('acetone');
  const isAsset = job.templateId?.includes('asset') || job.jobName.toLowerCase().includes('asset');
  const isAutomotive = job.templateId?.includes('kanban') || job.jobName.toLowerCase().includes('kanban') || job.jobName.toLowerCase().includes('automotive');

  // Dimensions & Aspect ratio
  const dimensions = matchedTemplate?.dimensions || {
    width: isPallet ? 100 : isPharma ? 70 : 100,
    height: isPallet ? 150 : isPharma ? 35 : 60
  };

  const isPortrait = dimensions.height >= dimensions.width;
  const aspectRatio = dimensions.width / dimensions.height;

  const containerSizes = {
    sm: isPortrait ? 'w-10 h-14' : 'w-14 h-10',
    md: isPortrait ? 'w-14 h-20' : 'w-20 h-14',
    lg: isPortrait ? 'w-24 h-32' : 'w-32 h-20'
  };

  // Extract relevant sample text or dynamic payload values
  const payloadData = job.labelDataJson || {};
  const jobTitle = job.jobName.replace(/\[REPRINT\]\s*/i, '');

  return (
    <div
      className={`relative shrink-0 rounded bg-[#fdfdfd] border border-gray-300 shadow-sm overflow-hidden flex flex-col justify-between p-1 select-none pointer-events-none group-hover:border-blue-400 group-hover:shadow transition-all ${containerSizes[size]} ${className}`}
      style={{
        aspectRatio: `${aspectRatio}`,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
      title={`Label Spec: ${job.templateName} (${dimensions.width}×${dimensions.height}mm)`}
    >
      {/* Visual Header / Micro Badge */}
      <div className="flex items-center justify-between w-full border-b border-gray-200 pb-0.5 mb-0.5">
        <span className="text-[6px] font-black tracking-tighter uppercase text-gray-800 truncate max-w-[80%] leading-none">
          {isPallet ? 'GS1 PALLET' : isPharma ? 'PHARMA Rx' : isGhs ? 'GHS HAZARD' : isAsset ? 'ASSET' : isAutomotive ? 'KANBAN' : 'LABEL'}
        </span>
        <span className="w-1 h-1 rounded-full bg-blue-600 shrink-0" />
      </div>

      {/* Label Content Body Simulation */}
      <div className="flex-1 flex flex-col justify-center space-y-0.5 overflow-hidden w-full">
        {isPallet ? (
          <>
            <div className="space-y-[1px]">
              <div className="h-[2px] bg-gray-700 rounded-xs w-4/5" />
              <div className="h-[2px] bg-gray-400 rounded-xs w-3/5" />
            </div>

            {/* 1D Barcode representation */}
            <div className="my-0.5 py-0.5 px-0.5 bg-white border border-gray-300 flex items-center justify-center space-x-[1px] h-3">
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[2px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[3px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[2px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[2px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[3px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
            </div>

            {/* SSCC Micro Footer */}
            <div className="text-[5px] font-mono font-bold text-gray-800 text-center tracking-tighter truncate leading-none">
              {payloadData.SSCC_Code ? `(00)${String(payloadData.SSCC_Code).slice(-8)}` : '(00) SSCC-18'}
            </div>
          </>
        ) : isPharma ? (
          <div className="flex items-center space-x-1 w-full h-full">
            {/* 2D DataMatrix Simulation */}
            <div className="w-3.5 h-3.5 bg-gray-900 grid grid-cols-3 gap-[0.5px] p-[1px] shrink-0 rounded-xs">
              <span className="bg-white" />
              <span className="bg-black" />
              <span className="bg-white" />
              <span className="bg-black" />
              <span className="bg-white" />
              <span className="bg-black" />
              <span className="bg-white" />
              <span className="bg-white" />
              <span className="bg-black" />
            </div>

            <div className="flex-1 space-y-[1px] min-w-0">
              <div className="h-[2px] bg-red-600 rounded-xs w-full" />
              <div className="h-[2px] bg-gray-700 rounded-xs w-4/5" />
              <div className="text-[5px] font-mono text-gray-600 truncate leading-none">
                {payloadData.LOT_Num || 'LOT-X994'}
              </div>
            </div>
          </div>
        ) : isGhs ? (
          <div className="flex items-center space-x-1">
            {/* Red Diamond GHS Pictogram Simulation */}
            <div className="w-2.5 h-2.5 border border-red-600 rotate-45 flex items-center justify-center shrink-0">
              <div className="w-1 h-1 bg-red-600 -rotate-45" />
            </div>
            <div className="flex-1 space-y-[1px]">
              <div className="h-[2px] bg-red-700 rounded-xs w-full" />
              <div className="h-[2px] bg-gray-700 rounded-xs w-3/4" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-[1px]">
              <div className="h-[2px] bg-gray-800 rounded-xs w-5/6" />
              <div className="h-[2px] bg-gray-400 rounded-xs w-1/2" />
            </div>
            <div className="flex items-center justify-center space-x-[1px] h-2.5 bg-white border border-gray-200 my-0.5">
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[2px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
              <span className="w-[2px] h-full bg-black" />
              <span className="w-[1px] h-full bg-black" />
            </div>
          </>
        )}
      </div>

      {/* Micro Footer Indicator */}
      <div className="flex items-center justify-between pt-0.5 border-t border-gray-200 text-[5px] font-mono text-gray-500 leading-none">
        <span>{job.outputLanguage}</span>
        <span>{dimensions.width}×{dimensions.height}</span>
      </div>
    </div>
  );
};
