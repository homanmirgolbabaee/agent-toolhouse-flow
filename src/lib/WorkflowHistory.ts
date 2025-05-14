// History management for undo/redo functionality
export interface HistoryState {
  nodes: any[];
  edges: any[];
  bundles: any[];
  timestamp: number;
}

export class WorkflowHistory {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;

  // Save current state to history
  saveState(nodes: any[], edges: any[], bundles: any[]) {
    // Remove any future history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      bundles: JSON.parse(JSON.stringify(bundles)),
      timestamp: Date.now()
    };

    this.history.push(newState);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  // Undo to previous state
  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Redo to next state
  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // Check if undo is possible
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  // Check if redo is possible
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  // Clear history
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}