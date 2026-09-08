import { useConfigStore } from "@/store/useLocationStore";

type BMapReadyCallback = () => void;

export class BmapController {
  private static loadPromise: Promise<void> | null = null;
  private static isLoad = false;

  static insertBMapEle(): Promise<void> {
    if (this.isLoad && this.isBMapReady()) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const ak =
        location.hostname === "localhost"
          ? "QfsfdSaTbBV1RneMR2h0awHUoAQv0vbI"
          : "Lyk77sjX2XfTbsj49I3e1OKIP3MgKEqz";

      const callbackName = "resourcebaiduMapInit";

      const handleReady = () => {
        if (!this.isBMapReady()) {
          this.loadPromise = null;
          reject(new Error("百度地图脚本已回调，但 BMapGL 未初始化"));
          return;
        }

        this.isLoad = true;
        resolve();
      };
      window[callbackName] = handleReady;

      const existingScript = document.getElementById(
        "DcResourceBmapScript",
      ) as HTMLScriptElement | null;

      if (existingScript) {
        if (this.isBMapReady()) {
          handleReady();
          return;
        }
        existingScript.addEventListener("load", handleReady, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("百度地图脚本加载失败")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "DcResourceBmapScript";
      script.type = "text/javascript";
      script.async = true;
      script.src =
        `https://api.map.baidu.com/api?type=webgl&v=1.0` +
        `&ak=${ak}&callback=${callbackName}&s=1`;

      script.onload = () => {
        if (this.isBMapReady()) {
          handleReady();
        }
      };

      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error("百度地图脚本加载失败"));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  private static isBMapReady(): boolean {
    return (
      typeof window.BMapGL !== "undefined" &&
      typeof window.BMapGL.Geolocation === "function" &&
      typeof window.BMapGL.Geocoder === "function"
    );
  }

  static whenLoad(fn: BMapReadyCallback) {
    if (this.isLoad && this.isBMapReady()) {
      fn();
      return;
    }

    void this.insertBMapEle()
      .then(fn)
      .catch((error) => {
        console.error("百度地图初始化失败", error);
      });
  }

  static getAddresByPoint(point: BMapGL.Point) {
    if (!this.isBMapReady()) {
      console.warn("BMapGL 尚未准备完成");
      return;
    }

    const geoCoder = new window.BMapGL.Geocoder();

    geoCoder.getLocation(
      point,
      (result: BMapGL.GeocoderResult & Record<"content", unknown>) => {
        this.updateStore(point.lat, point.lng, result);
      },
    );
  }

  private static updateStore(
    lat: number,
    lng: number,
    res: BMapGL.GeocoderResult & Record<"content", unknown>,
  ) {
    const updateLocationInfo =
      useConfigStore.getState().updateLocationInfo;

    const content = res.content as
      | {
          address_detail?: {
            town?: string;
            adcode?: string;
          };
        }
      | undefined;

    updateLocationInfo({
      lat,
      lng,
      provinceName: res.addressComponents?.province ?? "",
      cityName: res.addressComponents?.city ?? "",
      district: res.addressComponents?.district ?? "",
      town: content?.address_detail?.town ?? "",
      address: res.address ?? "",
      districtId: content?.address_detail?.adcode ?? "",
    });
  }
}