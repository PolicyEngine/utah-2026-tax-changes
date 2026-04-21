'use client';

import { useMemo, useState } from 'react';

export interface UtahDistrictData {
  district: string;
  district_number: string;
  representative: string;
  party?: 'R' | 'D';
  region: string;
  average_household_income_change: number;
  relative_household_income_change: number;
  winners_share?: number;
  losers_share?: number;
  poverty_pct_change?: number;
  child_poverty_pct_change?: number;
  state?: string;
}

interface Props {
  data: UtahDistrictData[];
  selectedDistrict: string | null;
  onSelect: (districtNumber: string) => void;
}

// PolicyEngine diverging color scale (gray -> teal)
const DIVERGING_COLORS = [
  '#475569', // gray-600 (most negative)
  '#94A3B8', // gray-400
  '#E2E8F0', // gray-200 (neutral/zero)
  '#81E6D9', // teal-200
  '#319795', // teal-500 (most positive)
];

// Real geographic SVG paths for Utah's 4 congressional districts (118th Congress)
// Coordinate space: 0..400 x 0..425 (approximate) — source: Census TIGER/Line
const UTAH_DISTRICT_PATHS: Record<
  string,
  { path: string; center: { x: number; y: number } }
> = {
  '1': {
    path: 'M20.7,102.1 L20.9,81.9 L20.9,73.1 L20.9,72.4 L20.8,56.1 L21.0,53.7 L24.2,45.9 L36.6,46.2 L40.7,46.2 L59.7,45.9 L64.6,45.9 L67.2,45.8 L71.2,45.8 L77.7,45.7 L95.6,45.5 L102.1,45.5 L104.2,45.5 L107.6,45.5 L116.5,45.4 L135.1,45.3 L139.7,45.3 L150.3,45.3 L155.0,45.7 L155.7,45.6 L159.6,45.6 L172.2,45.5 L173.5,45.5 L176.3,45.5 L186.2,45.5 L202.8,45.4 L205.4,45.4 L209.1,45.4 L217.7,45.3 L236.0,75.6 L236.0,79.8 L235.9,91.3 L235.9,99.2 L235.9,117.4 L248.5,117.4 L248.4,123.2 L244.9,127.2 L241.3,129.0 L238.9,128.4 L234.7,128.4 L227.7,129.9 L225.1,130.7 L219.4,131.0 L217.7,131.6 L210.5,130.7 L212.3,135.0 L208.1,136.0 L207.9,140.2 L206.1,140.0 L205.3,140.0 L202.6,140.0 L201.2,140.3 L200.7,140.0 L199.2,140.4 L197.1,139.5 L196.7,138.9 L184.8,138.0 L183.5,139.5 L182.0,139.7 L179.6,139.7 L179.4,138.3 L179.4,137.6 L179.4,137.0 L179.6,136.4 L179.7,135.5 L178.8,135.2 L177.4,135.2 L176.7,135.2 L176.1,135.2 L175.3,135.2 L175.2,133.3 L174.4,132.0 L173.3,130.8 L174.6,130.2 L176.6,129.6 L178.2,128.6 L179.4,127.6 L180.7,125.5 L178.7,124.8 L177.6,124.2 L177.3,123.4 L176.9,122.1 L176.1,120.7 L176.6,119.7 L176.0,117.4 L174.9,116.1 L174.2,116.1 L174.1,116.2 L173.8,116.3 L173.3,116.3 L172.4,116.8 L172.8,117.1 L172.7,117.3 L172.0,117.5 L167.6,117.9 L164.1,117.9 L160.5,114.7 L158.4,110.8 L132.0,111.7 L110.0,117.2 L20.8,117.2 L20.8,102.3 Z',
    center: { x: 162, y: 82 },
  },
  '2': {
    path: 'M20.0,362.0 L20.1,351.0 L20.1,350.9 L20.2,349.6 L20.2,345.4 L20.2,341.2 L20.2,322.1 L20.2,314.8 L20.2,303.7 L20.2,296.8 L20.2,293.4 L20.2,291.6 L20.2,280.3 L20.3,269.9 L20.4,269.6 L20.4,225.0 L20.4,206.3 L20.4,201.9 L20.4,195.8 L20.4,186.9 L20.4,181.6 L20.5,172.4 L20.5,158.6 L20.5,153.6 L20.6,152.7 L20.7,134.6 L20.7,133.6 L81.1,117.2 L119.8,114.8 L135.0,111.0 L158.9,112.6 L162.7,115.7 L166.9,118.3 L169.6,118.2 L172.4,117.5 L172.8,117.3 L172.8,117.1 L173.3,116.3 L173.7,116.4 L173.9,116.3 L174.2,116.1 L174.4,116.1 L175.6,117.3 L176.6,119.1 L176.1,119.8 L176.8,122.2 L177.0,122.8 L177.3,124.0 L178.1,124.2 L178.7,125.7 L179.3,126.5 L178.0,127.6 L176.6,129.1 L175.3,130.0 L173.5,130.0 L173.4,131.2 L174.7,132.6 L175.3,133.8 L175.5,135.2 L176.6,135.2 L176.7,135.2 L178.0,135.2 L178.9,135.2 L179.6,135.8 L179.4,137.0 L179.4,137.4 L179.4,137.9 L179.4,138.8 L179.0,139.7 L177.9,139.7 L176.7,139.7 L175.5,139.7 L173.1,139.8 L171.9,140.1 L170.5,140.1 L169.1,140.1 L167.1,140.1 L165.7,140.1 L165.7,141.1 L165.6,141.6 L165.5,141.9 L165.5,142.0 L165.7,142.1 L165.7,143.2 L164.9,143.7 L163.6,143.7 L153.8,144.0 L154.9,145.7 L154.3,148.7 L154.0,152.1 L155.1,155.2 L153.8,155.4 L152.4,158.0 L153.2,161.6 L153.5,163.2 L153.4,165.7 L154.0,168.1 L154.6,171.2 L155.3,173.3 L156.0,174.9 L156.4,176.0 L155.0,177.9 L154.8,179.6 L156.2,182.0 L155.1,186.2 L156.0,188.6 L159.6,191.0 L160.0,194.2 L161.6,195.3 L163.2,197.7 L162.1,200.6 L162.0,203.4 L159.2,206.5 L153.1,209.3 L149.1,212.2 L143.8,218.3 L152.2,221.1 L153.6,223.1 L152.9,225.7 L153.9,234.1 L157.6,237.2 L162.3,238.3 L166.5,257.6 L178.0,258.5 L217.8,258.6 L217.8,276.0 L217.2,284.4 L217.3,296.8 L309.3,296.8 L310.2,300.6 L307.9,300.1 L310.6,302.3 L308.7,304.7 L312.0,305.0 L313.0,305.8 L313.7,308.3 L315.4,307.4 L313.6,309.0 L315.0,310.6 L316.3,312.8 L316.2,314.1 L318.2,314.3 L318.2,315.3 L317.1,316.4 L318.4,317.9 L318.1,318.7 L316.0,321.4 L316.3,321.9 L316.2,322.4 L315.8,323.0 L315.2,323.0 L314.5,323.3 L314.0,323.7 L313.9,324.0 L313.7,324.3 L313.4,324.6 L312.9,324.7 L312.4,325.0 L312.2,325.4 L311.7,325.5 L311.2,325.3 L310.5,324.8 L309.9,325.2 L309.5,325.6 L309.0,326.2 L308.6,326.7 L308.1,327.1 L307.8,327.6 L308.0,328.2 L308.0,328.7 L307.8,329.2 L307.2,329.2 L306.6,329.6 L306.2,330.1 L305.9,330.7 L305.6,331.2 L305.8,331.8 L305.7,332.5 L305.2,333.0 L304.4,333.1 L303.8,332.7 L303.4,332.3 L302.7,332.1 L302.0,332.2 L301.1,332.6 L300.7,333.4 L299.9,333.8 L299.4,334.4 L298.9,335.4 L298.1,335.8 L297.1,336.3 L296.3,337.1 L296.7,338.2 L296.7,339.0 L296.4,339.8 L295.7,340.4 L294.1,340.2 L292.7,340.0 L291.4,340.4 L291.1,341.5 L291.2,342.1 L290.5,342.3 L290.1,341.8 L289.9,340.8 L288.8,340.6 L287.3,340.6 L285.6,340.4 L284.0,340.6 L282.6,341.0 L282.0,341.8 L282.2,342.6 L282.0,343.5 L280.6,344.0 L279.9,345.1 L279.8,346.1 L279.4,346.7 L278.4,346.4 L277.2,346.5 L276.8,347.3 L277.2,348.0 L277.6,348.8 L278.6,349.1 L279.8,348.8 L280.5,348.7 L280.2,349.3 L279.2,349.9 L279.0,350.9 L278.3,352.1 L277.4,353.1 L276.5,353.9 L276.3,354.4 L276.3,355.6 L275.6,356.6 L275.4,357.6 L274.8,357.7 L273.9,357.6 L273.2,358.4 L272.2,359.0 L271.3,358.4 L270.6,358.8 L270.5,360.1 L269.3,360.9 L268.0,361.1 L267.8,361.9 L268.1,363.3 L266.7,364.1 L265.3,364.9 L264.7,365.7 L263.1,368.9 L263.4,370.2 L258.7,371.6 L258.9,373.2 L260.2,375.2 L257.6,375.3 L259.2,377.9 L258.2,379.7 L256.8,380.4 L253.3,381.5 L248.4,379.7 L250.1,381.3 L250.7,383.3 L249.3,385.6 L247.4,387.0 L246.9,388.8 L246.3,391.4 L244.7,391.8 L243.8,393.9 L242.8,394.9 L240.8,395.4 L238.4,396.2 L235.8,397.4 L232.0,397.2 L229.6,398.1 L227.4,397.0 L225.8,398.2 L222.3,399.5 L222.8,401.8 L220.0,400.7 L217.7,401.4 L217.2,402.9 L215.6,403.1 L210.2,404.4 L209.7,404.4 L141.8,404.5 L140.3,404.5 L128.6,404.5 L127.3,404.5 L107.9,404.5 L102.9,404.5 L98.0,404.5 L89.9,404.5 L73.6,404.5 L62.8,404.5 L26.3,404.6 L20.2,404.5 L20.1,398.0 L20.1,394.9 L20.1,392.2 L20.1,384.2 L20.1,383.5 L20.1,377.9 L20.1,374.5 L20.0,370.6 L20.0,368.5 L20.0,367.4 L20.0,366.4 Z',
    center: { x: 120, y: 280 },
  },
  '3': {
    path: 'M173.6,155.9 L174.9,154.1 L175.3,152.8 L175.2,150.8 L174.7,148.1 L174.5,146.5 L174.4,144.5 L176.6,144.5 L177.1,143.8 L177.1,142.4 L177.2,141.2 L177.1,139.7 L178.6,139.7 L179.6,139.7 L182.0,139.7 L183.5,139.5 L184.8,138.0 L196.7,138.9 L197.1,139.5 L199.2,140.4 L200.7,140.0 L201.2,140.3 L202.6,140.0 L205.3,140.0 L206.1,140.0 L207.9,140.2 L208.1,136.0 L212.3,135.0 L210.5,130.7 L217.7,131.6 L219.4,131.0 L225.1,130.7 L227.7,129.9 L234.7,128.4 L238.9,128.4 L241.3,129.0 L244.9,127.2 L248.4,123.2 L248.5,117.4 L259.8,117.5 L272.3,117.5 L284.1,117.6 L294.0,117.6 L302.4,117.4 L310.7,117.4 L311.1,117.4 L321.5,117.4 L331.6,117.4 L334.4,117.4 L344.5,117.4 L364.9,117.2 L370.5,117.2 L379.5,129.7 L379.5,141.5 L379.5,144.6 L379.4,150.3 L379.3,153.5 L379.3,173.1 L379.3,176.1 L379.3,184.8 L379.3,198.0 L379.3,225.1 L379.3,234.6 L379.2,252.5 L379.1,265.0 L379.1,267.7 L379.1,269.9 L378.7,281.0 L378.6,296.8 L378.6,312.9 L379.9,320.9 L379.9,332.8 L379.9,334.6 L380.0,341.3 L380.0,344.1 L380.0,347.1 L380.0,351.4 L380.0,353.5 L379.9,359.7 L379.9,361.2 L379.9,366.4 L379.8,369.7 L379.7,378.7 L379.7,386.6 L379.7,389.4 L379.6,391.8 L379.7,396.5 L379.7,397.6 L379.7,399.2 L379.7,404.6 L366.2,404.6 L364.0,404.6 L363.5,404.6 L355.6,404.6 L338.0,404.7 L332.0,404.7 L311.1,404.7 L311.1,404.7 L277.6,404.7 L275.9,404.3 L268.1,404.3 L266.2,404.3 L234.5,404.4 L221.0,404.5 L214.8,404.5 L217.3,403.6 L219.1,401.6 L217.6,399.8 L221.7,403.0 L221.5,400.8 L223.6,400.5 L226.4,397.3 L228.3,397.9 L230.5,396.8 L234.3,396.9 L236.2,396.8 L240.0,396.5 L242.0,395.7 L242.5,393.8 L244.4,393.4 L246.4,392.0 L247.2,390.7 L248.2,388.2 L247.8,386.3 L248.4,383.9 L250.9,382.1 L248.8,381.0 L249.6,379.5 L255.3,381.4 L256.9,379.4 L258.3,378.8 L257.0,375.9 L259.5,375.8 L260.9,373.5 L257.6,372.0 L259.4,370.0 L265.2,369.5 L263.7,366.8 L264.8,365.6 L266.1,364.4 L267.7,363.9 L268.0,362.6 L267.7,361.5 L268.4,361.1 L270.1,360.6 L270.6,359.4 L270.8,358.5 L271.6,358.6 L272.9,358.9 L273.6,357.8 L274.5,357.4 L275.0,357.8 L275.4,357.2 L276.2,356.1 L276.3,354.9 L276.1,354.2 L276.9,353.7 L277.5,352.5 L278.9,351.6 L279.0,350.3 L279.8,349.5 L280.5,348.9 L280.2,348.6 L279.3,349.0 L278.1,349.2 L277.3,348.5 L277.1,347.5 L277.0,346.9 L277.7,346.5 L279.1,346.5 L279.8,346.4 L279.8,345.6 L280.1,344.4 L281.2,343.8 L282.2,343.0 L282.1,342.2 L282.0,341.5 L283.2,340.8 L284.8,340.5 L286.6,340.6 L288.0,340.6 L289.3,340.6 L290.0,341.4 L290.3,342.2 L290.9,342.3 L291.2,341.8 L291.1,341.0 L292.0,340.0 L293.2,340.1 L294.9,340.3 L296.2,340.2 L296.5,339.4 L296.9,338.6 L296.4,337.7 L296.6,336.6 L297.6,336.2 L298.5,335.6 L299.3,334.9 L299.6,333.9 L300.3,333.6 L300.9,333.0 L301.4,332.3 L302.4,332.1 L303.1,332.2 L303.6,332.5 L304.1,332.9 L304.7,333.1 L305.6,332.8 L305.8,332.2 L305.6,331.5 L305.8,331.0 L306.0,330.5 L306.3,329.8 L306.9,329.4 L307.5,329.2 L307.9,328.9 L308.0,328.5 L307.8,327.9 L308.0,327.3 L308.3,326.9 L308.8,326.5 L309.1,325.9 L309.6,325.4 L310.1,325.0 L311.1,325.1 L311.5,325.5 L312.0,325.5 L312.3,325.2 L312.7,324.8 L313.2,324.7 L313.7,324.5 L313.8,324.1 L314.0,323.8 L314.2,323.4 L314.9,323.1 L315.5,323.0 L316.1,322.7 L316.3,322.2 L316.3,321.8 L319.3,319.1 L319.2,317.8 L317.0,317.2 L319.1,316.2 L317.0,315.0 L317.7,313.3 L315.7,313.7 L314.7,311.6 L313.9,309.9 L314.8,308.5 L314.5,307.3 L312.0,307.0 L313.0,305.0 L311.0,306.1 L310.8,303.1 L309.2,300.6 L308.5,299.7 L310.9,298.1 L249.3,296.8 L217.3,296.1 L217.8,284.4 L217.9,259.6 L217.8,245.7 L217.7,227.3 L221.5,227.3 L221.5,210.3 L233.6,202.4 L249.5,196.3 L233.3,196.2 L230.8,193.1 L230.7,191.4 L229.0,190.0 L226.6,187.9 L224.6,185.5 L221.6,185.7 L222.3,184.1 L223.4,180.1 L223.1,177.0 L220.7,174.8 L220.3,171.7 L213.4,168.3 L207.4,168.2 L205.4,168.1 L200.3,170.3 L201.5,171.3 L203.2,173.7 L203.8,175.1 L200.1,178.1 L198.4,177.9 L197.3,177.1 L196.3,177.1 L195.4,177.5 L194.9,177.5 L186.8,177.6 L186.6,175.9 L187.4,175.6 L186.2,172.2 L186.2,172.1 L186.1,171.9 L186.2,171.8 L186.4,171.9 L186.5,171.6 L186.4,170.4 L184.8,169.0 L183.8,165.1 L181.7,164.4 L180.5,162.0 L179.6,161.4 L178.9,160.6 L176.5,159.1 L173.8,156.8 L173.6,155.9 Z',
    center: { x: 300, y: 260 },
  },
  '4': {
    path: 'M143.8,218.3 L149.1,212.2 L153.1,209.3 L159.2,206.5 L162.0,203.4 L162.1,200.6 L163.2,197.7 L161.6,195.3 L160.0,194.2 L159.6,191.0 L156.0,188.6 L155.1,186.2 L156.2,182.0 L154.8,179.6 L155.0,177.9 L156.4,176.0 L156.0,174.9 L155.3,173.3 L154.6,171.2 L154.0,168.1 L153.4,165.7 L153.5,163.2 L153.2,161.6 L152.4,158.0 L153.8,155.4 L155.1,155.2 L154.0,152.1 L154.3,148.7 L154.9,145.7 L153.8,144.0 L163.6,143.7 L164.9,143.7 L165.7,143.2 L165.7,142.1 L165.5,142.0 L165.5,141.9 L165.6,141.6 L165.7,141.1 L165.7,140.1 L167.1,140.1 L169.1,140.1 L170.5,140.1 L171.9,140.1 L173.1,139.8 L175.5,139.7 L176.7,139.7 L177.1,140.6 L177.2,141.5 L177.1,142.9 L177.1,144.4 L175.3,144.5 L174.2,145.2 L174.6,146.8 L174.6,148.1 L175.3,151.2 L175.3,153.2 L174.7,154.3 L173.7,156.6 L175.3,158.1 L176.9,159.3 L179.3,160.9 L180.5,162.0 L181.7,162.4 L182.7,164.8 L183.8,168.9 L185.2,169.6 L186.6,171.4 L186.5,171.7 L186.3,171.8 L186.2,171.8 L186.3,172.1 L186.3,172.2 L187.1,175.5 L187.7,176.2 L185.5,177.1 L192.8,177.5 L194.9,177.5 L196.2,177.1 L196.6,176.8 L198.0,177.3 L200.1,178.1 L203.9,177.1 L203.2,175.0 L202.6,172.3 L200.3,171.3 L202.7,168.6 L206.4,167.5 L212.4,167.7 L216.9,168.5 L219.7,173.1 L221.5,175.2 L222.7,178.5 L221.9,182.9 L221.4,185.1 L223.0,186.5 L225.1,186.8 L227.4,189.8 L230.0,191.2 L229.9,192.8 L233.3,193.1 L247.1,196.3 L249.5,202.5 L221.5,202.5 L221.5,219.1 L219.0,227.3 L217.7,232.9 L217.8,258.6 L178.0,258.5 L166.5,257.6 L162.3,238.3 L157.6,237.2 L153.9,234.1 L152.9,225.7 L153.6,223.1 L152.2,221.1 L143.8,218.3 Z',
    center: { x: 190, y: 195 },
  },
};

const parseHex = (color: string) => ({
  r: parseInt(color.slice(1, 3), 16),
  g: parseInt(color.slice(3, 5), 16),
  b: parseInt(color.slice(5, 7), 16),
});

function interpolateColor(value: number, min: number, max: number): string {
  if (min >= max) return DIVERGING_COLORS[2];
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const segments = DIVERGING_COLORS.length - 1;
  const segPos = t * segments;
  const segIndex = Math.min(Math.floor(segPos), segments - 1);
  const segT = segPos - segIndex;
  const c0 = parseHex(DIVERGING_COLORS[segIndex]);
  const c1 = parseHex(DIVERGING_COLORS[segIndex + 1]);
  const r = Math.round(c0.r + (c1.r - c0.r) * segT);
  const g = Math.round(c0.g + (c1.g - c0.g) * segT);
  const b = Math.round(c0.b + (c1.b - c0.b) * segT);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

const formatSignedCurrency = (value: number) => {
  const base = formatCurrency(Math.abs(value));
  if (value > 0) return `+${base}`;
  if (value < 0) return `-${base}`;
  return base;
};

export default function UtahDistrictChoroplethMap({
  data,
  selectedDistrict,
  onSelect,
}: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    districtNumber: string;
  } | null>(null);

  const dataByDistrict = useMemo(() => {
    const map = new Map<string, UtahDistrictData>();
    data.forEach((d) => map.set(d.district_number, d));
    return map;
  }, [data]);

  const colorRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0 };
    const values = data.map((d) => d.average_household_income_change);
    const maxAbs = Math.max(...values.map(Math.abs));
    return { min: -maxAbs, max: maxAbs };
  }, [data]);

  const tooltipData = tooltip ? dataByDistrict.get(tooltip.districtNumber) : null;

  const minChange = data.length
    ? Math.min(...data.map((d) => d.average_household_income_change))
    : 0;
  const maxChange = data.length
    ? Math.max(...data.map((d) => d.average_household_income_change))
    : 0;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 400 425"
        style={{ width: '100%', height: 'auto', maxHeight: 500 }}
        role="img"
        aria-label="Map of Utah's 4 congressional districts"
      >
        {Object.entries(UTAH_DISTRICT_PATHS).map(([num, { path, center }]) => {
          const districtData = dataByDistrict.get(num);
          const value = districtData?.average_household_income_change ?? 0;
          const fill = districtData
            ? interpolateColor(value, colorRange.min, colorRange.max)
            : '#e5e7eb';
          const isSelected = selectedDistrict === num;

          return (
            <g
              key={num}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(num)}
              onMouseEnter={(evt) =>
                setTooltip({
                  x: evt.clientX,
                  y: evt.clientY,
                  districtNumber: num,
                })
              }
              onMouseMove={(evt) =>
                setTooltip({
                  x: evt.clientX,
                  y: evt.clientY,
                  districtNumber: num,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <path
                d={path}
                fill={fill}
                stroke={isSelected ? '#0f766e' : '#ffffff'}
                strokeWidth={isSelected ? 2.5 : 1}
                style={{
                  transition: 'opacity 0.15s',
                  opacity: tooltip && tooltip.districtNumber !== num ? 0.7 : 1,
                }}
              />
              <text
                x={center.x}
                y={center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="700"
                fill={value > (colorRange.max + colorRange.min) / 2 ? '#0f172a' : '#ffffff'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {num}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && tooltipData && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          <p className="font-semibold text-gray-900">
            UT-{String(tooltipData.district_number).padStart(2, '0')}
          </p>
          {tooltipData.representative && (
            <p className="text-sm text-gray-700">{tooltipData.representative}</p>
          )}
          <p className="text-sm text-gray-600">
            Avg impact: {formatSignedCurrency(tooltipData.average_household_income_change)}
          </p>
          <p className="text-sm text-gray-600">
            ({(tooltipData.relative_household_income_change * 100).toFixed(2)}% of income)
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600">{formatSignedCurrency(minChange)}</span>
        <div
          className="h-4 w-48 rounded"
          style={{ background: `linear-gradient(to right, ${DIVERGING_COLORS.join(', ')})` }}
        />
        <span className="text-sm text-gray-600">{formatSignedCurrency(maxChange)}</span>
      </div>
      <p className="text-xs text-gray-500 text-center mt-1">
        Average household impact from Utah 2026 tax changes
      </p>
    </div>
  );
}
