import { LBS_URL, LOGIN_URL } from "@/axios-config/request";
import { BaseApi, type Rsp8, baseApi } from "../baseApi";
import type { WeatherInfo } from "@/types/weather";
import type {
  ScreenBaseData,
  XinJiangCoalRoutes,
} from "@/store/useScreenBaseData";
import type { LoginAccountInfo } from "@/types/baseData";

const lbsApi = new BaseApi({
  baseURL: LBS_URL,
});

export function GetWeather(district: string) {
  return lbsApi.get<Rsp8<WeatherInfo>>(
    "/api/lbs/location-geoserver/weather-now",
    {
      district,
    },
  );
}

export function GetScreenBaseData() {
  return baseApi.get<ScreenBaseData>("/api/resource/wh_screen/hb/panel");
}

export function GetXinjiangCoalRoutes(params: {
  channelId: string;
  thinOut: boolean;
}) {
  return baseApi.get<Rsp8<XinJiangCoalRoutes>>(
    "/api/solution/premium-channels/channel-base/line-list",
    params,
  );
}

const loginParams = {
  client_id: "whisc-test",
  client_secret: "1q2w3e*",
  grant_type: "password",
};
export function AccountLogin(
  payload: Record<"username" | "password", string>,
) {
  const loginApi = new BaseApi({
    baseURL: LOGIN_URL,
    tokenKey: "noneToken"
  });

  return loginApi.post<LoginAccountInfo>(
    "/connect/token",
    {
      ...loginParams,
      ...payload,
    },
    true,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
}
