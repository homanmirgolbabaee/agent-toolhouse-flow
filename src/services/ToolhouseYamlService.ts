import yaml from 'js-yaml';

export interface ToolhouseAgentConfig {
  id: string;
  title: string;
  prompt: string;
  vars: Record<string, any>;
  bundle?: string;
  public?: boolean;
  toolhouse_id?: string;
  schedule?: string;
}

export interface ParsedAgent {
  config: ToolhouseAgentConfig;
  variables: Array<{
    name: string;
    value: any;
    type: string;
  }>;
}

class ToolhouseYamlService {
  parseYamlContent(yamlContent: string): ParsedAgent | null {
    try {
      const config = yaml.load(yamlContent) as ToolhouseAgentConfig;
      
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      // Validate required fields
      if (!config.title || !config.prompt) {
        throw new Error('Missing required fields: title and prompt are required');
      }

      // Extract variables with their types
      const variables = Object.entries(config.vars || {}).map(([name, value]) => ({
        name,
        value,
        type: this.inferType(value)
      }));

      return {
        config,
        variables
      };
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return null;
    }
  }

  private inferType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  // Generate a prompt with variables substituted
  generatePromptWithVariables(prompt: string, variables: Record<string, any>): string {
    let generatedPrompt = prompt;
    
    // Replace {variable} placeholders with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      generatedPrompt = generatedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return generatedPrompt;
  }

  // Validate agent configuration
  validateAgent(config: ToolhouseAgentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.title) errors.push('Title is required');
    if (!config.prompt) errors.push('Prompt is required');
    if (!config.id) errors.push('ID is required');

    // Check for variables in prompt that don't exist in vars
    const promptVariables = this.extractVariablesFromPrompt(config.prompt);
    const definedVariables = Object.keys(config.vars || {});
    
    promptVariables.forEach(variable => {
      if (!definedVariables.includes(variable)) {
        errors.push(`Variable "${variable}" used in prompt but not defined in vars`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private extractVariablesFromPrompt(prompt: string): string[] {
    const variableRegex = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(prompt)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  // Export agent configuration back to YAML
  exportToYaml(config: ToolhouseAgentConfig): string {
    return yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"'
    });
  }
}

export default new ToolhouseYamlService();