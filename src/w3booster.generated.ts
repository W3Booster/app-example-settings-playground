/* Generated from the W3Booster application database. Do not edit directly. */
// @w3booster-client-id app_d3091e0d2c64c7bb03231375
// @w3booster-revision 63f09f34a2c99e18da38fb2fbfa10dce58d35db175dfc3e0eaa58dcbd338adfa

import type { W3BoosterClient } from '@w3booster/sdk';
import { defineApplication, type ApplicationConnectOptions, type ApplicationRuntime, type ApplicationRuntimeSnapshot } from '@w3booster/sdk/app';
import type { DeepPartial } from '@w3booster/sdk/settings';

export interface W3BoosterAppSettings {
  display: {
    title: string;
    onAir: boolean;
  };
}
export type W3BoosterAppDeliveredSettings = DeepPartial<W3BoosterAppSettings>;
export type W3BoosterAppClient<TOverlayExtensions extends object = object> = W3BoosterClient<W3BoosterAppDeliveredSettings, TOverlayExtensions>;
export type W3BoosterAppRuntime<TOverlayExtensions extends object = object> = ApplicationRuntime<W3BoosterAppSettings, TOverlayExtensions>;
export type W3BoosterAppRuntimeSnapshot<TOverlayExtensions extends object = object> = ApplicationRuntimeSnapshot<W3BoosterAppSettings, TOverlayExtensions>;
const w3boosterAppDefinition = {
  clientId: "app_d3091e0d2c64c7bb03231375",
  revision: "63f09f34a2c99e18da38fb2fbfa10dce58d35db175dfc3e0eaa58dcbd338adfa",
  scopes: ["match:read"],
  settingsDefaults: {
    "display": {
      "title": "Community Cup · Round 1",
      "onAir": false
    }
  }
} as const;

export const w3boosterApp = defineApplication<
  W3BoosterAppSettings,
  typeof w3boosterAppDefinition.scopes
>(w3boosterAppDefinition);

export type W3BoosterAppConnectOptions<TOverlayExtensions extends object = object> = ApplicationConnectOptions<
  W3BoosterAppSettings,
  typeof w3boosterAppDefinition.scopes,
  TOverlayExtensions
>;
