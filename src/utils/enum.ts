export class EnumEntity {
  Enum: any;
  getSelf = (id: number) => {
    let self: any = { id: -1, label: "" };

    for (const key in this.Enum) {
      if (
        (this.Enum[key].id ||
          (typeof this.Enum[key].id === "number" && this.Enum[key].id === 0)) &&
        this.Enum[key].id === id
      ) {
        self = { ...this.Enum[key] };
        break;
      }
    }
    return self;
  };
  getArray: <T>() => Array<T> = () => {
    const result: any = [];
    for (const key in this.Enum) {
      if (
        this.Enum[key].id ||
        (typeof this.Enum[key].id === "number" && this.Enum[key].id === 0)
      ) {
        result.push({ ...this.Enum[key] });
      }
    }
    return result;
  };
}
