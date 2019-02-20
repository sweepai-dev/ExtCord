import Util from "util";

export default class Phrase {
    public name: string;
    public description: string;
    private defaults: { [key: string]: string };
    private templates: { [key: string]: string };

    constructor(info: IPhraseInfo) {
        this.name = info.name;
        this.description = info.description;
        this.defaults = info.defaults;
        this.templates = info.defaults;
    }

    public setTemplate(language: string, template: string) {
        this.templates[language] = template;
    }

    public format(language: string, stuff: Array<string|number>) {
        return Util.format(this.templates[language], ...stuff);
    }

    public parse(language: string, data: any) {
        if (typeof data === "string") {
            this.templates[language] = data;
            return [data, this.description];
        } else  {
            return [this.defaults[language] || "", this.description];
        }
    }
}

export interface IPhraseInfo {
    name: string;
    description: string;
    defaults: { [key: string]: string };
}
