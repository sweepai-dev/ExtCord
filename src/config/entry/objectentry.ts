import ConfigEntry, { IEntryInfo } from "./entry";

export default class ObjectConfigEntry extends ConfigEntry {
    private value?: object;
    private defaultValue?: object;

    constructor(info: IEntryInfo, defaultValue?: object) {
        super(info);
        this.defaultValue = defaultValue;
    }

    public get(): object {
        return this.value || this.defaultValue || {};
    }

    public parse(data: any): [object, string] {
        if (typeof data === "object") {
            this.value = data;
            return [data, this.description];
        } else  {
            return [this.defaultValue || {}, this.description];
        }
    }
}
