import React, { useState } from 'react';
import { TemplateRecord } from '../../types/template';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';
import { Tag, Sparkles, ZoomIn } from 'lucide-react';

export interface TemplateThumbnailProps {
  template: TemplateRecord;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
  showBadge?: boolean;
  showHoverZoom?: boolean;
  className?: string;
  onClick?: () => void;
}

export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
  template,
  size = 'sm',
  showBadge = false,
  showHoverZoom = false,
  className = '',
  onClick,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const width = template.width || template.document?.dimensions?.width || 100;
  const height = template.height || template.document?.dimensions?.height || 150;
  const unit = template.unit || template.document?.dimensions?.unit || 'mm';
  const isPortrait = height >= width;
  const aspectRatio = `${width} / ${height}`;

  // Fixed container dimensions based on size variant
  const sizeClasses = {
    xs: isPortrait ? 'w-8 h-11' : 'w-11 h-8',
    sm: isPortrait ? 'w-16 h-20' : 'w-20 h-16',
    md: isPortrait ? 'w-24 h-32' : 'w-32 h-24',
    lg: isPortrait ? 'w-36 h-48' : 'w-48 h-36',
    full: 'w-full h-full min-h-[120px]',
  }[size];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => showHoverZoom && setIsZoomed(true)}
      onMouseLeave={() => showHoverZoom && setIsZoomed(false)}
      className={`relative shrink-0 flex items-center justify-center rounded bg-[#101217] border border-[#2b303d] overflow-hidden group select-none shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-500 hover:shadow-md' : ''
      } ${sizeClasses} ${className}`}
      style={{
        aspectRatio: size !== 'full' ? aspectRatio : undefined,
      }}
      title={`${template.name} (${width}×${height} ${unit})`}
    >
      {/* Visual Label Paper Representation */}
      <div className="w-full h-full p-1 flex items-center justify-center">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-contain rounded shadow-xs bg-white pointer-events-none transition-transform duration-200"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              aspectRatio,
              transform: isZoomed ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        ) : template.document ? (
          <TemplatePreviewCanvas
            document={template.document}
            sampleData={template.sampleData}
            className="w-full h-full p-0.5 bg-white rounded shadow-xs"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 p-1">
            <Tag className="w-4 h-4 opacity-40 mb-1" />
            <span className="text-[8px] font-mono text-gray-400">No Preview</span>
          </div>
        )}
      </div>

      {/* Optional Dimension Badge */}
      {showBadge && (
        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-gray-200 border border-white/10 px-1 py-0.2 rounded text-[8px] font-mono font-medium pointer-events-none">
          {width}×{height} {unit}
        </div>
      )}

      {/* Hover Zoom Overlay Indicator */}
      {showHoverZoom && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded p-0.5 text-blue-400 pointer-events-none">
          <ZoomIn className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};
