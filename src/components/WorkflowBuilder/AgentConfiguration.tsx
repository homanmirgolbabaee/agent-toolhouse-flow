{/* Variables */}
      <Card>
        <Collapsible
          open={expandedSections.variables}
          onOpenChange={() => toggleSection('variables')}
        >
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCode className="h-5 w-5" />
                Variables
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(variables).length}
                </Badge>
              </CardTitle>
              {expandedSections.variables ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {Object.keys(variables).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No variables defined</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(variables).map(([name, value]) => (
                    <div key={name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor={`var-${name}`} className="font-medium">
                          {name}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {typeof value}
                        </Badge>
                      </div>
                      {renderVariableInput(name, value)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <Collapsible
          open={expandedSections.advanced}
          onOpenChange={() => toggleSection('advanced')}
        >
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              {expandedSections.advanced ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent-bundle">Bundle</Label>
                <Input
                  id="agent-bundle"
                  value={config.bundle || ''}
                  onChange={(e) => setConfig({ ...config, bundle: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="e.g., default"
                />
              </div>

              <div>
                <Label htmlFor="agent-toolhouse-id">Toolhouse ID</Label>
                <Input
                  id="agent-toolhouse-id"
                  value={config.toolhouse_id || ''}
                  onChange={(e) => setConfig({ ...config, toolhouse_id: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="default"
                />
              </div>

              <div>
                <Label htmlFor="agent-schedule">Schedule (Cron)</Label>
                <Input
                  id="agent-schedule"
                  value={config.schedule || ''}
                  onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                  disabled={!isEditing}
                  className="mt-1"
                  placeholder="e.g., 0 0 * * *"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for manual execution
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="agent-public"
                  checked={config.public || false}
                  onChange={(e) => setConfig({ ...config, public: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                  disabled={!isEditing}
                />
                <Label htmlFor="agent-public">Public Agent</Label>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Run Button */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Ready to Run</h3>
              <p className="text-sm text-blue-700">
                Execute the agent with the current configuration
              </p>
            </div>
            <Button
              onClick={onRun}
              disabled={isRunning}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Run Agent
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentConfiguration;