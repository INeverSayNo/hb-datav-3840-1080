import {
  DcToolsRequest,
  type defineConfig,
  type interceptorsUse,
} from "@dczy/tie-tools";

import {
  handleFulfilled,
  handleRejected,
  handleRequestFulfilled,
} from "./utils";
import { CRYPT_TYPE, GATEWAY_URL, runtimeConfig } from "@/axios-config/request";

export type { Rsp, Rsp8 } from "./types";
export { ApiError } from "./types";

const defaultInterceptors: interceptorsUse = {
  onRejected: handleRejected,
  onFulfilled: handleFulfilled,
  onRequestFulfilled: handleRequestFulfilled,
};

export class BaseApi extends DcToolsRequest {
  constructor(
    config: defineConfig = {},
    use: interceptorsUse = defaultInterceptors,
  ) {
    const requestConfig = runtimeConfig?.request;
    const hasCryptoOverride = Object.prototype.hasOwnProperty.call(
      config,
      "crypto",
    );

    const baseConfig: defineConfig = {
      baseURL: config.baseURL || GATEWAY_URL,
      timeout: requestConfig?.timeout,
      isJwt: requestConfig?.isJwt,
      tokenStorage: requestConfig?.tokenStorage,
      tokenKey: requestConfig?.tokenKey,
      tokenPrefix: requestConfig?.tokenPrefix,
      cryptoType: CRYPT_TYPE,
      ...config,
      crypto: hasCryptoOverride ? config.crypto : requestConfig?.crypto,
    };

    super(baseConfig, use);
  }
}

export const baseApi = new BaseApi();
