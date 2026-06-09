export type ControlSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ControlSizeInput = ControlSize | 'default';

export const controlSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const satisfies readonly ControlSize[];

export function normalizeControlSize(size: ControlSizeInput = 'md'): ControlSize {
  return size === 'default' ? 'md' : size;
}

export const controlHeightClass: Record<ControlSize, string> = {
  xs: 'h-[var(--control-h-xs)]',
  sm: 'h-[var(--control-h-sm)]',
  md: 'h-[var(--control-h-md)]',
  lg: 'h-[var(--control-h-lg)]',
  xl: 'h-[var(--control-h-xl)]',
};

export const controlIconSizeClass: Record<ControlSize, string> = {
  xs: 'size-[var(--control-h-xs)]',
  sm: 'size-[var(--control-h-sm)]',
  md: 'size-[var(--control-h-md)]',
  lg: 'size-[var(--control-h-lg)]',
  xl: 'size-[var(--control-h-xl)]',
};

/** Icon buttons embedded inside fields (password toggle, etc.). */
export const controlInsetIconSizeClass: Record<ControlSize, string> = {
  xs: 'size-6',
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-9',
  xl: 'size-10',
};

export const controlHeightDataClasses =
  'data-[size=xs]:h-[var(--control-h-xs)] data-[size=sm]:h-[var(--control-h-sm)] data-[size=md]:h-[var(--control-h-md)] data-[size=lg]:h-[var(--control-h-lg)] data-[size=xl]:h-[var(--control-h-xl)]';

export const controlMinHeightDataClasses =
  'data-[size=xs]:min-h-[var(--control-h-xs)] data-[size=sm]:min-h-[var(--control-h-sm)] data-[size=md]:min-h-[var(--control-h-md)] data-[size=lg]:min-h-[var(--control-h-lg)] data-[size=xl]:min-h-[var(--control-h-xl)]';

export const controlPaddingXDataClasses =
  'data-[size=xs]:px-2.5 data-[size=sm]:px-3 data-[size=md]:px-3.5 data-[size=lg]:px-4 data-[size=xl]:px-5';

export const controlTextDataClasses =
  'data-[size=xs]:text-xs data-[size=sm]:text-[13px] data-[size=md]:text-sm data-[size=lg]:text-[15px] data-[size=xl]:text-base';

export const controlRadiusDataClasses =
  'data-[size=xs]:rounded-[var(--r-sm)] data-[size=sm]:rounded-[var(--r-sm)] data-[size=md]:rounded-[var(--r-md)] data-[size=lg]:rounded-[var(--r-lg)] data-[size=xl]:rounded-[var(--r-lg)]';
