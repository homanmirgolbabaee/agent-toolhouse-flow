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
  description?: string;
  version?: string;
  tags?: string[];
  timeout?: number;
  retries?: number;
  model?: string;
}

export interface ParsedAgent {
  config: ToolhouseAgentConfig;
  variables: Array<{
    name: string;
    value: any;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class ToolhouseYamlService {
  private readonly REQUIRED_FIELDS = ['id', 'title', 'prompt'];
  private readonly CRON_REGEX = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

  parseYamlContent(yamlContent: string): ParsedAgent | null {
    try {
      // Clean the YAML content
      const cleanedContent = this.cleanYamlContent(yamlContent);
      
      // Parse YAML with safe load
      const config = yaml.load(cleanedContent, { 
        schema: yaml.DEFAULT_SAFE_SCHEMA,
        strict: true,
        json: true 
      }) as ToolhouseAgentConfig;
      
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid YAML structure: Expected an object at root level');
      }

      // Ensure vars is an object, not null/undefined
      if (!config.vars) {
        config.vars = {};
      }

      // Extract variables with enhanced metadata
      const variables = this.extractVariables(config);
      
      // Set defaults for optional fields
      config.bundle = config.bundle || 'default';
      config.public = config.public ?? true;
      config.toolhouse_id = config.toolhouse_id || 'default';

      return {
        config,
        variables
      };
    } catch (error) {
      console.error('Error parsing YAML:', error);
      if (error instanceof yaml.YAMLException) {
        console.error('YAML Parse Error:', error.message);
        console.error('Line:', error.mark?.line, 'Column:', error.mark?.column);
      }
      return null;
    }
  }

  private cleanYamlContent(content: string): string {
    // Remove BOM if present
    let cleaned = content.replace(/^\uFEFF/, '');
    
    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  private extractVariables(config: ToolhouseAgentConfig): Array<{
    name: string;
    value: any;
    type: string;
    required: boolean;
    description?: string;
  }> {
    const variables: Array<{
      name: string;
      value: any;
      type: string;
      required: boolean;
      description?: string;
    }> = [];

    // Extract variables from prompt
    const promptVariables = this.extractVariablesFromPrompt(config.prompt);
    
    // Process defined variables
    Object.entries(config.vars || {}).forEach(([name, value]) => {
      const variable = {
        name,
        value,
        type: this.inferType(value),
        required: promptVariables.includes(name),
        description: this.generateVariableDescription(name, value)
      };
      variables.push(variable);
    });

    // Check for variables used in prompt but not defined
    promptVariables.forEach(varName => {
      if (!config.vars[varName]) {
        variables.push({
          name: varName,
          value: '',
          type: 'string',
          required: true,
          description: `Variable used in prompt but not defined in vars`
        });
      }
    });

    return variables.sort((a, b) => {
      // Sort required variables first, then alphabetically
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  extractVariablesFromPrompt(prompt: string): string[] {
    // Enhanced regex to handle various variable formats
    const patterns = [
      /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,  // {variable}
      /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g,  // {{variable}}
      /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,   // ${variable}
    ];

    const variables: string[] = [];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(prompt)) !== null) {
        const varName = match[1];
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    });

    return variables;
  }

  private inferType(value: any): string {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    
    // Check for special string types
    if (typeof value === 'string') {
      // Email pattern
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
      // URL pattern
      if (/^https?:\/\/.+/.test(value)) return 'url';
      // Date pattern
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      // Numeric string
      if (/^\d+$/.test(value)) return 'numeric_string';
    }
    
    return 'string';
  }

  private generateVariableDescription(name: string, value: any): string {
    const type = this.inferType(value);
    
    // Generate contextual descriptions based on name and type
    const nameBasedDescriptions: Record<string, string> = {
      'topic': 'The main subject or theme',
      'name': 'A name or identifier',
      'title': 'A title or heading',
      'description': 'A detailed description',
      'url': 'A web URL or link',
      'email': 'An email address',
      'date': 'A date value',
      'count': 'A numeric count',
      'limit': 'A maximum limit',
      'text': 'Text content',
      'content': 'Main content',
      'message': 'A message or communication',
      'id': 'A unique identifier',
      'path': 'A file or URL path',
      'key': 'A key or password',
      'token': 'An access token'
    };

    // Check for partial name matches
    const partialMatch = Object.keys(nameBasedDescriptions).find(key => 
      name.toLowerCase().includes(key)
    );
    
    if (partialMatch) {
      return nameBasedDescriptions[partialMatch];
    }

    // Fallback based on type
    const typeDescriptions: Record<string, string> = {
      'string': 'A text value',
      'number': 'A numeric value',
      'integer': 'A whole number',
      'boolean': 'A true/false value',
      'array': 'A list of items',
      'object': 'A structured object',
      'email': 'An email address',
      'url': 'A web URL',
      'date': 'A date value'
    };

    return typeDescriptions[type] || 'A configurable value';
  }

  // Generate a prompt with variables substituted
  generatePromptWithVariables(prompt: string, variables: Record<string, any>): string {
    let generatedPrompt = prompt;
    
    // Replace variables with multiple patterns
    Object.entries(variables).forEach(([key, value]) => {
      const replacements = [
        { pattern: new RegExp(`\\{${key}\\}`, 'g'), replacement: String(value) },
        { pattern: new RegExp(`\\{\\{${key}\\}\\}`, 'g'), replacement: String(value) },
        { pattern: new RegExp(`\\$\\{${key}\\}`, 'g'), replacement: String(value) }
      ];

      replacements.forEach(({ pattern, replacement }) => {
        generatedPrompt = generatedPrompt.replace(pattern, replacement);
      });
    });

    return generatedPrompt;
  }

  // Enhanced validation with warnings
  validateAgent(config: ToolhouseAgentConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    this.REQUIRED_FIELDS.forEach(field => {
      if (!config[field as keyof ToolhouseAgentConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // ID validation
    if (config.id) {
      if (!/^[a-zA-Z0-9_-]+$/.test(config.id)) {
        errors.push('ID can only contain letters, numbers, hyphens, and underscores');
      }
      if (config.id.length < 3 || config.id.length > 100) {
        errors.push('ID must be between 3 and 100 characters');
      }
    }

    // Title validation
    if (config.title) {
      if (config.title.length < 1 || config.title.length > 200) {
        errors.push('Title must be between 1 and 200 characters');
      }
    }

    // Prompt validation
    if (config.prompt) {
      if (config.prompt.length < 10) {
        warnings.push('Prompt is very short, consider adding more detail');
      }
      if (config.prompt.length > 10000) {
        warnings.push('Prompt is very long, consider shortening for better performance');
      }
    }

    // Variable validation
    if (config.prompt && config.vars) {
      const promptVars = this.extractVariablesFromPrompt(config.prompt);
      const definedVars = Object.keys(config.vars);
      
      // Check for variables in prompt that aren't defined
      promptVars.forEach(variable => {
        if (!definedVars.includes(variable)) {
          errors.push(`Variable "${variable}" used in prompt but not defined in vars`);
        }
      });
      
      // Check for defined variables not used in prompt
      definedVars.forEach(variable => {
        if (!promptVars.includes(variable)) {
          warnings.push(`Variable "${variable}" defined but not used in prompt`);
        }
      });
    }

    // Schedule validation
    if (config.schedule) {
      if (!this.CRON_REGEX.test(config.schedule)) {
        errors.push(`Invalid cron schedule format: ${config.schedule}`);
      }
    }

    // Bundle validation
    if (config.bundle) {
      if (!/^[a-zA-Z0-9_-]+$/.test(config.bundle)) {
        warnings.push('Bundle name should only contain letters, numbers, hyphens, and underscores');
      }
    }

    // Timeout validation
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 1 || config.timeout > 3600) {
        errors.push('Timeout must be a number between 1 and 3600 seconds');
      }
    }

    // Retries validation
    if (config.retries !== undefined) {
      if (typeof config.retries !== 'number' || config.retries < 0 || config.retries > 10) {
        errors.push('Retries must be a number between 0 and 10');
      }
    }

    // Model validation
    if (config.model) {
      const validModels = [
        'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
        'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'
      ];
      if (!validModels.includes(config.model)) {
        warnings.push(`Model "${config.model}" may not be supported. Valid models: ${validModels.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Export agent configuration back to YAML
  exportToYaml(config: ToolhouseAgentConfig): string {
    // Clean up the config object for export
    const exportConfig = { ...config };
    
    // Remove empty or default values
    if (exportConfig.bundle === 'default') {
      delete exportConfig.bundle;
    }
    if (exportConfig.toolhouse_id === 'default') {
      delete exportConfig.toolhouse_id;
    }
    if (exportConfig.public === true) {
      delete exportConfig.public;
    }
    if (!exportConfig.schedule) {
      delete exportConfig.schedule;
    }
    if (!exportConfig.description) {
      delete exportConfig.description;
    }
    if (!exportConfig.version) {
      delete exportConfig.version;
    }
    if (!exportConfig.tags || exportConfig.tags.length === 0) {
      delete exportConfig.tags;
    }

    return yaml.dump(exportConfig, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false,
      sortKeys: (a, b) => {
        // Define custom order for keys
        const keyOrder = [
          'id', 'title', 'description', 'prompt', 'vars', 
          'bundle', 'public', 'toolhouse_id', 'schedule',
          'model', 'timeout', 'retries', 'version', 'tags'
        ];
        
        const aIndex = keyOrder.indexOf(a);
        const bIndex = keyOrder.indexOf(b);
        
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }
    });
  }

  // Create a new agent template
  createAgentTemplate(title: string, prompt: string, variables: Record<string, any> = {}): ToolhouseAgentConfig {
    return {
      id: this.generateId(title),
      title,
      prompt,
      vars: variables,
      bundle: 'default',
      public: true,
      toolhouse_id: 'default'
    };
  }

  // Generate a valid ID from title
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
      .substring(0, 50)              // Limit length
      .concat('-', Math.random().toString(36).substring(2, 8)); // Add random suffix
  }

  // Validate YAML string without parsing
  isValidYaml(yamlString: string): boolean {
    try {
      yaml.load(yamlString, { schema: yaml.DEFAULT_SAFE_SCHEMA });
      return true;
    } catch {
      return false;
    }
  }

  // Get schema information for UI hints
  getSchemaInfo(): {
    required: string[];
    optional: string[];
    descriptions: Record<string, string>;
  } {
    return {
      required: this.REQUIRED_FIELDS,
      optional: [
        'vars', 'bundle', 'public', 'toolhouse_id', 'schedule',
        'description', 'version', 'tags', 'timeout', 'retries', 'model'
      ],
      descriptions: {
        id: 'Unique identifier for the agent (alphanumeric, hyphens, underscores)',
        title: 'Human-readable name for the agent',
        prompt: 'The instructions for the agent (can include {variable} placeholders)',
        vars: 'Object containing variable definitions used in the prompt',
        bundle: 'Bundle name for organizing agents (default: "default")',
        public: 'Whether the agent is publicly accessible (default: true)',
        toolhouse_id: 'Toolhouse identifier for the agent (default: "default")',
        schedule: 'Cron expression for scheduled execution (optional)',
        description: 'Detailed description of the agent\'s purpose',
        version: 'Version identifier for the agent',
        tags: 'Array of tags for categorizing the agent',
        timeout: 'Maximum execution time in seconds (1-3600)',
        retries: 'Number of retry attempts on failure (0-10)',
        model: 'AI model to use (e.g., gpt-4o, gpt-4o-mini)'
      }
    };
  }

  // Check if agent configuration has breaking changes
  hasBreakingChanges(oldConfig: ToolhouseAgentConfig, newConfig: ToolhouseAgentConfig): boolean {
    // ID changes are always breaking
    if (oldConfig.id !== newConfig.id) return true;
    
    // Check if required variables were removed
    const oldVars = this.extractVariablesFromPrompt(oldConfig.prompt);
    const newVars = this.extractVariablesFromPrompt(newConfig.prompt);
    
    return oldVars.some(varName => !newVars.includes(varName));
  }

  // Merge two agent configurations
  mergeConfigurations(base: ToolhouseAgentConfig, override: Partial<ToolhouseAgentConfig>): ToolhouseAgentConfig {
    return {
      ...base,
      ...override,
      vars: { ...base.vars, ...override.vars }
    };
  }
}

export default new ToolhouseYamlService();