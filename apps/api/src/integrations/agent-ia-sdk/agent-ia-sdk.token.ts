import type { AgentIaSdk } from '@company-os/agent-ia-sdk';

/** DI token for the wired `AgentIaSdk` instance. Inject with `@Inject(AGENT_IA_SDK)`. */
export const AGENT_IA_SDK = Symbol('AGENT_IA_SDK');

/** Type alias for injection sites: `@Inject(AGENT_IA_SDK) sdk: AgentIaSdkRef`. */
export type AgentIaSdkRef = AgentIaSdk;
