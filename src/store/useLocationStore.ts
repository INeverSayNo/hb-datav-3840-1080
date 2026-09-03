import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface LocationInfo {
  lat: number;
  lng: number;
  districtId: string;
  provinceName: string;
  cityName: string;
  district: string;
  town: string;
  address: string;
}

interface ConfigStore extends LocationInfo {
  poi: string;

  updateLocationInfo: (
    payload: Omit<LocationInfo, "updateLocationInfo">,
  ) => void;
}

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector((set) => ({
    lat: 30.598624,
    lng: 114.311734,
    districtId: "",
    provinceName: "湖北省",
    cityName: "武汉市",
    district: "",
    town: "",
    address: "湖北省武汉市",
    poi: "",
    updateLocationInfo: (payload) => set(payload),
  })),
);
