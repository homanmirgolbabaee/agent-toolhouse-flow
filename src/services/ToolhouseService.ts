
import { Toolhouse } from "@toolhouseai/sdk";

class ToolhouseService {
  private toolhouse: any;
  private initialized = false;
  private tools: any[] = [];

  async initialize(apiKey: string, metadata = {}) {
    try {
      console.log('Initializing Toolhouse service');
      this.toolhouse = new Toolhouse({
        apiKey,
        metadata
      });
      this.initialized = true;
      console.log('Toolhouse service initialized');
      
      // Get available tools
      this.tools = await this.toolhouse.getTools();
      console.log(`Retrieved ${this.tools.length} tools`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Toolhouse:', error);
      return false;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  async getTools() {
    if (!this.initialized) {
      console.warn('Toolhouse not initialized');
      return [];
    }
    
    try {
      if (this.tools.length === 0) {
        this.tools = await this.toolhouse.getTools();
      }
      return this.tools;
    } catch (error) {
      console.error('Failed to get tools:', error);
      return [];
    }
  }

  async runTools(openAIResponse: any) {
    if (!this.initialized) {
      console.warn('Toolhouse not initialized');
      return null;
    }
    
    try {
      const result = await this.toolhouse.runTools(openAIResponse);
      return result;
    } catch (error) {
      console.error('Failed to run Toolhouse tools:', error);
      return null;
    }
  }
}

// Create singleton instance
const toolhouseService = new ToolhouseService();
export default toolhouseService;
