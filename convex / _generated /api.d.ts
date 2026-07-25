/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activations from "../activations.js";
import type * as admin from "../admin.js";
import type * as customers from "../customers.js";
import type * as devices from "../devices.js";
import type * as http from "../http.js";
import type * as mpesa from "../mpesa.js";
import type * as packages from "../packages.js";
import type * as payments from "../payments.js";
import type * as portal from "../portal.js";
import type * as reports from "../reports.js";
import type * as routers from "../routers.js";
import type * as sessions from "../sessions.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as vouchers from "../vouchers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activations: typeof activations;
  admin: typeof admin;
  customers: typeof customers;
  devices: typeof devices;
  http: typeof http;
  mpesa: typeof mpesa;
  packages: typeof packages;
  payments: typeof payments;
  portal: typeof portal;
  reports: typeof reports;
  routers: typeof routers;
  sessions: typeof sessions;
  settings: typeof settings;
  users: typeof users;
  vouchers: typeof vouchers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
