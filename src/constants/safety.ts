import { interpolateRgbBasis } from 'd3-interpolate';
import { scaleThreshold } from 'd3-scale';

/**
 * Single source of truth for minimum independent reports required before
 * showing aggregated counts or sequential shading on any map, list, or sheet.
 */
export const MIN_REPORTS = 5;

export const MAP_ZOOM = {
  default: 13,
  min: 11,
  max: 16,
} as const;

export interface HeatBinSpec {
  step: number;
  min: number;
  max: number | null;
  lightFill: string;
  lightInk: string;
  darkFill: string;
  darkInk: string;
}

const lightInterpolator = interpolateRgbBasis([
  '#6366F1',
  '#06B6D4',
  '#22C55E',
  '#FACC15',
  '#EF4444',
]);
const darkInterpolator = interpolateRgbBasis([
  '#818CF8',
  '#22D3EE',
  '#4ADE80',
  '#FACC15',
  '#F87171',
]);

export const HEAT_THRESHOLDS: [number, number, number, number] = [
  MIN_REPORTS + 3,
  MIN_REPORTS + 7,
  MIN_REPORTS + 12,
  MIN_REPORTS + 20,
];

export const HEAT_BINS: HeatBinSpec[] = [
  {
    step: 0,
    min: MIN_REPORTS,
    max: HEAT_THRESHOLDS[0] - 1,
    lightFill: lightInterpolator(0),
    lightInk: '#FFFFFF',
    darkFill: darkInterpolator(0),
    darkInk: '#0F172A',
  },
  {
    step: 1,
    min: HEAT_THRESHOLDS[0],
    max: HEAT_THRESHOLDS[1] - 1,
    lightFill: lightInterpolator(0.25),
    lightInk: '#0F172A',
    darkFill: darkInterpolator(0.25),
    darkInk: '#0F172A',
  },
  {
    step: 2,
    min: HEAT_THRESHOLDS[1],
    max: HEAT_THRESHOLDS[2] - 1,
    lightFill: lightInterpolator(0.5),
    lightInk: '#0F172A',
    darkFill: darkInterpolator(0.5),
    darkInk: '#0F172A',
  },
  {
    step: 3,
    min: HEAT_THRESHOLDS[2],
    max: HEAT_THRESHOLDS[3] - 1,
    lightFill: lightInterpolator(0.75),
    lightInk: '#0F172A',
    darkFill: darkInterpolator(0.75),
    darkInk: '#0F172A',
  },
  {
    step: 4,
    min: HEAT_THRESHOLDS[3],
    max: null,
    lightFill: lightInterpolator(1),
    lightInk: '#FFFFFF',
    darkFill: darkInterpolator(1),
    darkInk: '#0F172A',
  },
];

const stepIndexScale = scaleThreshold<number, number>()
  .domain(HEAT_THRESHOLDS)
  .range([0, 1, 2, 3, 4]);

export function getHeatBinForCount(count: number): HeatBinSpec {
  const idx = stepIndexScale(count);
  return HEAT_BINS[idx] ?? HEAT_BINS[0];
}

export function getAreaColors(
  reportCount: number | null,
  belowThreshold: boolean,
  theme: 'light' | 'dark'
): {
  fill: string;
  stroke: string;
  ink: string;
  fillOpacity: number;
  dashArray?: string;
} {
  if (belowThreshold || reportCount === null || reportCount < MIN_REPORTS) {
    return theme === 'dark'
      ? {
          fill: '#5C6C75',
          stroke: '#8B9CA6',
          ink: '#A6B5BD',
          fillOpacity: 0.18,
          dashArray: '6 5',
        }
      : {
          fill: '#9BA7AE',
          stroke: '#6A7880',
          ink: '#4B5B63',
          fillOpacity: 0.18,
          dashArray: '6 5',
        };
  }

  const bin = getHeatBinForCount(reportCount);
  if (theme === 'dark') {
    return {
      fill: bin.darkFill,
      stroke: '#66CBD6',
      ink: bin.darkInk,
      fillOpacity: 0.56,
    };
  }
  return {
    fill: bin.lightFill,
    stroke: '#166873',
    ink: bin.lightInk,
    fillOpacity: 0.48,
  };
}
