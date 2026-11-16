import { SmsProvider } from './types';

export class SmsProviderRegistry {
  private static instance: SmsProviderRegistry;
  private providers: Map<string, SmsProvider> = new Map();
  private defaultProviderName: string = 'mediana';

  public static getInstance(): SmsProviderRegistry {
    if (!SmsProviderRegistry.instance) {
      SmsProviderRegistry.instance = new SmsProviderRegistry();
    }
    return SmsProviderRegistry.instance;
  }

  register(provider: SmsProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  get(name?: string): SmsProvider {
    const target = (name || this.defaultProviderName).toLowerCase();
    const provider = this.providers.get(target);
    if (!provider) {
      throw new Error(`SMS Provider '${target}' not found in registry. Available: ${this.list().join(', ')}`);
    }
    return provider;
  }

  setDefault(name: string) {
    if (!this.providers.has(name.toLowerCase())) {
      throw new Error(`Cannot set default: Provider '${name}' is not registered`);
    }
    this.defaultProviderName = name.toLowerCase();
  }

  getDefaultName(): string {
    return this.defaultProviderName;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
