export class WebhookCommand<TEvent = any, TDependencies = any> {
    protected event: TEvent;
    protected dependencies: TDependencies;
  
    constructor(event: TEvent, dependencies: TDependencies) {
      this.event = event;
      this.dependencies = dependencies;
    }
  
    async execute(): Promise<void> {
      throw new Error("Execute method must be implemented");
    }
  }
  