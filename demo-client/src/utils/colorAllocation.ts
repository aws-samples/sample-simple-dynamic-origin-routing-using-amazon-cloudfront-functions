// Dynamic color allocation system for origin IDs

const COLOR_POOL = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#009688', // Teal
  '#FF5722', // Deep Orange
  '#3F51B5', // Indigo
  '#8BC34A', // Light Green
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#FFC107', // Amber
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#CDDC39', // Lime
];

export class ColorAllocator {
  private colorMap = new Map<string, string>();
  private nextColorIndex = 0;

  allocateColor(originId: string): string {
    if (this.colorMap.has(originId)) {
      return this.colorMap.get(originId)!;
    }

    // Special color for missing origin header to indicate it's an error state
    if (originId === 'missing origin header') {
      const color = '#E74C3C'; // Distinctive red color
      this.colorMap.set(originId, color);
      return color;
    }

    const color = COLOR_POOL[this.nextColorIndex % COLOR_POOL.length];
    this.colorMap.set(originId, color);
    this.nextColorIndex++;
    
    return color;
  }

  getColor(originId: string): string | undefined {
    return this.colorMap.get(originId);
  }

  getAllocatedColors(): Map<string, string> {
    return new Map(this.colorMap);
  }

  reset(): void {
    this.colorMap.clear();
    this.nextColorIndex = 0;
  }
}
