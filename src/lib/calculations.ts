/**
 * Core business logic for Flex Printing calculations
 */

export interface MaterialDimensions {
  width: number;
  height: number;
  quantity: number;
}

export interface CalculationResult {
  actualArea: number;
  chargedArea: number;
  wastage: number;
}

/**
 * Calculates the area for a printing job including standard margins.
 * @param dims - Physical dimensions of the job
 * @param marginFt - Extra margin added to each side (default 0.1ft)
 * @param wastagePerSideFt - Inherent machine wastage per side (default 0.25ft)
 */
export function calculateJobArea(
  dims: MaterialDimensions, 
  marginFt: number = 0.1, 
  wastagePerSideFt: number = 0.25
): CalculationResult {
  const physicalWidth = dims.width + (marginFt * 2);
  const physicalHeight = dims.height + (marginFt * 2);
  
  // Total width including machine wastage
  const machineWidth = physicalWidth + (wastagePerSideFt * 2);
  
  const actualArea = dims.width * dims.height * dims.quantity;
  const chargedArea = machineWidth * physicalHeight * dims.quantity;
  
  return {
    actualArea: Number(actualArea.toFixed(2)),
    chargedArea: Number(chargedArea.toFixed(2)),
    wastage: Number((chargedArea - actualArea).toFixed(2))
  };
}

/**
 * Calculates roll utilization
 */
export function calculateRollRemaining(
  initialArea: number,
  consumedArea: number
): number {
  return Math.max(0, Number((initialArea - consumedArea).toFixed(2)));
}
