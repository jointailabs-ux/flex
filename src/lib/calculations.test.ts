import { describe, it, expect } from 'vitest';
import { calculateJobArea, calculateRollRemaining } from './calculations';

describe('Flex Printing Calculations', () => {
  it('should calculate standard job area correctly', () => {
    const dims = { width: 10, height: 10, quantity: 1 };
    // Margin = 0.1 per side (total 0.2), Wastage = 0.25 per side (total 0.5)
    // physicalWidth = 10.2, physicalHeight = 10.2
    // machineWidth = 10.2 + 0.5 = 10.7
    // chargedArea = 10.7 * 10.2 = 109.14
    
    const result = calculateJobArea(dims);
    expect(result.actualArea).toBe(100);
    expect(result.chargedArea).toBe(109.14);
    expect(result.wastage).toBe(9.14);
  });

  it('should handle zero quantity', () => {
    const dims = { width: 10, height: 10, quantity: 0 };
    const result = calculateJobArea(dims);
    expect(result.actualArea).toBe(0);
    expect(result.chargedArea).toBe(0);
  });

  it('should calculate remaining roll area', () => {
    const remaining = calculateRollRemaining(1000, 45.5);
    expect(remaining).toBe(954.5);
  });

  it('should not return negative remaining area', () => {
    const remaining = calculateRollRemaining(10, 100);
    expect(remaining).toBe(0);
  });
});
