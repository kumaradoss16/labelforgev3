// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateTemplateThumbnailSvg,
  fetchStoredTemplates,
  fetchTemplateThumbnail,
  getStoredTemplates,
} from '../services/templateStorage';
import { TemplateCenter } from '../components/templates/TemplateCenter';
import { TemplateThumbnail } from '../components/templates/TemplateThumbnail';
import { BUILTIN_TEMPLATE_LIBRARY } from '../services/templateLibraryData';

describe('TemplateCenter Thumbnail Fetching & Visual Presentation', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('generates an authentic visual SVG thumbnail resolving dynamic sample data', () => {
    const sampleTemplate = BUILTIN_TEMPLATE_LIBRARY[0];
    const svg = generateTemplateThumbnailSvg(sampleTemplate.document, sampleTemplate.sampleData);

    expect(svg).toBeDefined();
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`viewBox="0 0 ${sampleTemplate.document.dimensions.width} ${sampleTemplate.document.dimensions.height}"`);
    // Check that resolved sample value appears in text rather than raw placeholder
    expect(svg).toContain('ACME LOGISTICS');
    expect(svg).not.toContain('{{Customer_Name}}');
  });

  it('fetchStoredTemplates asynchronously fetches templates and attaches visual thumbnails', async () => {
    const templates = await fetchStoredTemplates();

    expect(templates.length).toBeGreaterThan(0);
    const first = templates[0];
    expect(first.thumbnail).toBeDefined();
    expect(first.thumbnail).toMatch(/^data:image\/svg\+xml/);
    expect(first.thumbnailSvg).toBeDefined();
    expect(first.thumbnailSvg).toContain('<svg');
  });

  it('fetchTemplateThumbnail resolves or produces thumbnail data URL for a template', async () => {
    const sample = BUILTIN_TEMPLATE_LIBRARY[1];
    const thumb = await fetchTemplateThumbnail(sample);

    expect(thumb).toBeDefined();
    expect(thumb).toMatch(/^data:image\/svg\+xml/);
  });

  it('TemplateThumbnail renders visual thumbnail with accurate aspect ratio', () => {
    const sample = BUILTIN_TEMPLATE_LIBRARY[0];
    sample.thumbnail = 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 150"><rect/></svg>';

    const root = createRoot(container!);
    act(() => {
      root.render(
        <TemplateThumbnail
          template={sample}
          size="sm"
          showBadge
        />
      );
    });

    const img = container!.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(sample.thumbnail);
    const expectedW = sample.width || sample.document.dimensions.width;
    const expectedH = sample.height || sample.document.dimensions.height;
    const expectedU = sample.unit || sample.document.dimensions.unit || 'mm';
    expect(container!.textContent).toContain(`${expectedW}×${expectedH} ${expectedU}`);
  });

  it('TemplateCenter displays visual thumbnails for each template after async fetching', async () => {
    const handleUse = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(
        <TemplateCenter
          onUseTemplateToDesign={handleUse}
        />
      );
    });

    // Allow async fetching to complete and re-render
    await act(async () => {
      await new Promise(r => setTimeout(r, 60));
    });

    expect(container!.textContent).toContain('GS1-128 Logistics Shipping & Pallet Label');

    // Verify visual thumbnails (img with data URL or SVG elements) are rendered
    const visualElements = container!.querySelectorAll('img[src^="data:image/svg+xml"], svg');
    expect(visualElements.length).toBeGreaterThan(0);
  });
});
