import type { CryptoType } from "@dczy/tie-tools";

export type RuntimeEnvironmentMap = Record<string, string>;
export type RuntimeCryptoType = "Ecdh" | "SM";
export type RuntimeTokenStorage = "localStorage" | "sessionStorage";

export interface RuntimeRequestOptions {
  timeout: number;
  isJwt: boolean;
  tokenStorage: RuntimeTokenStorage;
  tokenKey: string;
  tokenPrefix: string;
  crypto: boolean;
  cryptoType: RuntimeCryptoType;
  userName: string;
  password: string
}

export interface RuntimeConfigFile {
  env: string;
  gateway_url: RuntimeEnvironmentMap;
  login_url: RuntimeEnvironmentMap;
  file_url: RuntimeEnvironmentMap;
  getfile_url: RuntimeEnvironmentMap;
  jssdk_url: RuntimeEnvironmentMap;
  ai_solution_url: RuntimeEnvironmentMap;
  lbs_url: RuntimeEnvironmentMap;
  request: Partial<RuntimeRequestOptions>;
}

export interface RuntimeConfig {
  env: string;
  GATEWAY_URL: string;
  PATH_URL: string;
  LOGIN_URL: string;
  FILE_URL: string;
  GETFILE_URL: string;
  JSSDK_URL: string;
  AI_SOLUTION_URL: string;
  LBS_URL: string;
  CRYPT_TYPE: CryptoType;
  request: RuntimeRequestOptions;
}

export class RuntimeConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RuntimeConfigError";
  }
}

const defaultRequestOptions: RuntimeRequestOptions = {
  timeout: 90000,
  isJwt: true,
  tokenStorage: "localStorage",
  tokenKey: "JsToken",
  tokenPrefix: "bearer ",
  crypto: false,
  cryptoType: "Ecdh",
  userName: "13667184155",
  password: "13667184155279"
};

const cryptoTypeValues = {
  SM: 0 as CryptoType,
  Ecdh: 1 as CryptoType,
};

export let runtimeConfig: RuntimeConfig | null = null;
let runtimeConfigPromise: Promise<RuntimeConfig> | null = null;

export let env = "";
export let GATEWAY_URL = "";
export let PATH_URL = "";
export let LOGIN_URL = "";
export let FILE_URL = "";
export let GETFILE_URL = "";
export let JSSDK_URL = "";
export let AI_SOLUTION_URL = "";
export let LBS_URL = "";
export let CRYPT_TYPE: CryptoType = cryptoTypeValues.Ecdh;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequestOptions(value: unknown): RuntimeRequestOptions {
  if (value !== undefined && !isRecord(value)) {
    throw new RuntimeConfigError("config.json 中的 request 必须是对象");
  }

  const options = {
    ...defaultRequestOptions,
    ...(value as Partial<RuntimeRequestOptions> | undefined),
  };
  return options;
}

function resolveRuntimeConfig(value: unknown): RuntimeConfig {
  const raw = value as unknown as RuntimeConfigFile;
  const request = parseRequestOptions(raw.request);
  const config = {
    env: raw.env,
    GATEWAY_URL: raw.gateway_url[raw.env],
    PATH_URL: raw.gateway_url[raw.env],
    LOGIN_URL: raw.login_url[raw.env],
    FILE_URL: raw.file_url[raw.env],
    GETFILE_URL: raw.getfile_url[raw.env],
    JSSDK_URL: raw.jssdk_url[raw.env],
    AI_SOLUTION_URL: raw.ai_solution_url[raw.env],
    LBS_URL: raw.lbs_url[raw.env],
    CRYPT_TYPE:
      request.cryptoType === "SM" ? cryptoTypeValues.SM : cryptoTypeValues.Ecdh,
    request,
  };
  runtimeConfig = config;
  env = config.env;
  GATEWAY_URL = config.GATEWAY_URL;
  PATH_URL = config.PATH_URL;
  LOGIN_URL = config.LOGIN_URL;
  FILE_URL = config.FILE_URL;
  GETFILE_URL = config.GETFILE_URL;
  JSSDK_URL = config.JSSDK_URL;
  AI_SOLUTION_URL = config.AI_SOLUTION_URL;
  LBS_URL = config.LBS_URL;
  CRYPT_TYPE = config.CRYPT_TYPE;
  return config;
}

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (runtimeConfig) return Promise.resolve(runtimeConfig);
  if (runtimeConfigPromise) return runtimeConfigPromise;

  const configUrl = `${import.meta.env.BASE_URL}config.json?t=${Date.now()}`;
  runtimeConfigPromise = fetch(configUrl, { cache: "no-store" })
    .then(async (response) => {
      return await response.json();
    })
    .then(resolveRuntimeConfig);
  return runtimeConfigPromise;
}
