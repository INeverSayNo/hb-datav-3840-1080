import { useConfigStore } from "@/store/useLocationStore";

export class BmapController {
  static isLoad = false;
  static eventList = new Set<Function>();
  static async insertBMapEle() {
    const ak =
      location.href.indexOf("localhost") > -1
        ? "QfsfdSaTbBV1RneMR2h0awHUoAQv0vbI"
        : "Lyk77sjX2XfTbsj49I3e1OKIP3MgKEqz"; //await getAK()
    (window as any).resourcebaiduMapInit = () => {
      this.isLoad = true;
      this.executeCallbacks();
    };
    const src = document.getElementById("DcResourceBmapScript");
    if (src) {
      (window as any).resourcebaiduMapInit();
      return;
    }
    const script = document.createElement("script");
    script.id = "DcResourceBmapScript";
    script.type = "text/javascript";
    script.src = `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${ak}&callback=resourcebaiduMapInit&s=1`;
    document.head.appendChild(script);
  }

  private static updateStore(lat: number, lng: number, res: any) {
    const updateLocationInfo = useConfigStore((s) => s.updateLocationInfo);
    const payload = {
      lat: lat,
      lng: lng,
      provinceName: res?.addressComponents?.province ?? "",
      cityName: res?.addressComponents?.city ?? "",
      district: res?.addressComponents?.district ?? "",
      town: res?.content?.address_detail?.town ?? "",
      address: res?.address,
      districtId: res?.content?.address_detail?.adcode ?? "",
    };
    updateLocationInfo(payload);
  }
  static whenLoad(fn = () => {}) {
    this.isLoad ? fn() : this.eventList.add(fn);
  }

  static getAddresByPoint(point: BMapGL.Point) {
    const geoCoder = new BMapGL.Geocoder();
    geoCoder.getLocation(
      point,
      (result: BMapGL.GeocoderResult & Record<"content", any>) => {
        this.updateStore(point.lat, point.lng, result);
      },
    );
  }

  static getAddrssWithPoint = (point: BMapGL.Point) => {
    const geo = new BMapGL.Geocoder();
    return new Promise<BMapGL.GeocoderResult>((resolve, _reject) => {
      geo.getLocation(
        point,
        (res: any) => {
          resolve(res);
        },
        {
          poiRadius: 1000,
          numPois: 16,
        },
      );
    });
  };

  static executeCallbacks() {
    this.eventList.forEach((fn) => fn());
    this.eventList.clear();
  }
}
