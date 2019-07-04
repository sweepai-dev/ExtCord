import { IPhraseInfo, Phrase } from "./phrase";

export class PhraseGroup extends Phrase {
    public phrases: Map<string, Phrase>;

    constructor(info: IPhraseInfo, phrases?: Phrase[]) {
        super(info);
        this.phrases = new Map();
        if (phrases) {
            for (const phrase of phrases) {
                this.phrases.set(phrase.name, phrase);
                for (const language of phrase.languages) {
                    if (!this.languages.includes(language)) {
                        this.languages.push(language);
                    }
                }
            }
        }
    }

    public addPhrase(phrase: Phrase) {
        this.phrases.set(phrase.name, phrase);
        for (const language of phrase.languages) {
            if (!this.languages.includes(language)) {
                this.languages.push(language);
            }
        }
    }

    public removePhrase(phrase: Phrase) {
        if (this.phrases.has(phrase.name)) {
            this.phrases.delete(phrase.name);
        }
    }

    public parse(language: string, data: any): [object, string?] {
        if (typeof data !== "object") {
            data = {};
        }
        for (const [name, phrase] of this.phrases) {
            const [parsed, comment] = phrase.parse(language, data[name]);
            data[name] = parsed;
            if (!data[name + "__commentBefore__"]) {
                Object.defineProperty(data, name + "__commentBefore__", { enumerable: false, writable: true});
                data[name + "__commentBefore__"] = comment;
            }
        }
        return [data, this.description];
    }
}
