/* Generated from the W3Booster application database. Do not edit directly. */
// @w3booster-client-id app_d3091e0d2c64c7bb03231375
// @w3booster-revision 6ee1abfb4015f8a670b31d6d16a05f1cc43f6712c88bd6fa43514ae5c76122e9

import type { W3BoosterClient } from '@w3booster/sdk';
import { defineApplication, type ApplicationConnectOptions, type ApplicationRuntime, type ApplicationRuntimeSnapshot } from '@w3booster/sdk/app';
import type { DeepPartial } from '@w3booster/sdk/settings';

export interface W3BoosterAppSettings {
  display: {
    title: string;
  };
}
export type W3BoosterAppDeliveredSettings = DeepPartial<W3BoosterAppSettings>;
export type W3BoosterAppClient<TOverlayExtensions extends object = object> = W3BoosterClient<W3BoosterAppDeliveredSettings, TOverlayExtensions>;
export type W3BoosterAppRuntime<TOverlayExtensions extends object = object> = ApplicationRuntime<W3BoosterAppSettings, TOverlayExtensions>;
export type W3BoosterAppRuntimeSnapshot<TOverlayExtensions extends object = object> = ApplicationRuntimeSnapshot<W3BoosterAppSettings, TOverlayExtensions>;
const w3boosterAppDefinition = {
  clientId: "app_d3091e0d2c64c7bb03231375",
  revision: "6ee1abfb4015f8a670b31d6d16a05f1cc43f6712c88bd6fa43514ae5c76122e9",
  scopes: ["match:read","players:read","resources:read","heroes:read","overlay:read"],
  settingsDefaults: {
    "display": {
      "title": "My first W3Booster app"
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
