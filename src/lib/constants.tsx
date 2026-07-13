import React from 'react';
import { Box, Layers, Square, Hash, Monitor, Smartphone, Tags, Shirt, LayoutGrid, Zap } from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  regex: RegExp;
}

export const CATEGORIES: Category[] = [
  { id: 'flex', label: 'Flex Printing', icon: <Box size={24} />, gradient: 'brand-gradient', regex: /flex/i },
  { id: 'vinyl', label: 'Vinyl Art', icon: <Layers size={24} />, gradient: 'indigo-gradient', regex: /vinyl/i },
  { id: 'board', label: 'Board & Signage', icon: <Square size={24} />, gradient: 'teal-gradient', regex: /board|sunboard|foam/i },
  { id: 'backlit', label: 'Backlit Units', icon: <Monitor size={24} />, gradient: 'rose-gradient', regex: /backlit|glow|light/i },
  { id: 'display', label: 'Display Materials', icon: <LayoutGrid size={24} />, gradient: 'brand-gradient', regex: /standee|banner|frame|hardware|display/i },
  { id: 'stickers', label: 'Stickers & Labels', icon: <Tags size={24} />, gradient: 'indigo-gradient', regex: /sticker|label/i },
  { id: 'fabric', label: 'Fabric Printing', icon: <Shirt size={24} />, gradient: 'teal-gradient', regex: /canvas|fabric|cloth|satin/i },
  { id: 'specialty', label: 'Specialty', icon: <Zap size={24} />, gradient: 'rose-gradient', regex: /card|flyer|offset|others/i },
];
