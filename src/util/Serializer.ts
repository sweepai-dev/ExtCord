import Hjson = require("hjson");

const regex = /^#|^\/\//;
const setComments = (object: any) => {
    if (object.__COMMENTS__) {
        for (const o of object.__COMMENTS__.o) {
            Object.defineProperty(object, o + "__commentBefore__", { enumerable: false, writable: true});
            Object.defineProperty(object, o + "__commentAfter__", { enumerable: false, writable: true});
            const commentsBefore = (object.__COMMENTS__.c[o][0] as string).split("\n");
            const commentsBeforeFixed: string[] = [];
            for (const comment of commentsBefore) {
                commentsBeforeFixed.push(comment.trim());
            }
            object[o + "__commentBefore__"] = commentsBeforeFixed.join("\n");
            const commentsAfter = (object.__COMMENTS__.c[o][1] as string).split("\n");
            const commentsAfterFixed: string[] = [];
            for (const comment of commentsAfter) {
                commentsAfterFixed.push(comment.trim());
            }
            object[o + "__commentAfter__"] = commentsAfterFixed.join("\n");
        }
        object.__COMMENTS__ = undefined;
    }
    for (const value of Object.values(object)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                // TODO process comments inside array
                if (typeof item === "object") {
                    setComments(item);
                }
            }
        } else if (typeof value === "object") {
            setComments(value);
        }
    }
};
const getComments = (object: any, level = 1) => {
    if (!object.__COMMENTS__) {
        Object.defineProperty(object, "__COMMENTS__", { enumerable: false, writable: true });
        object.__COMMENTS__ = {};
    }
    if (!object.__COMMENTS__.c) {
        object.__COMMENTS__.c = {};
    }
    if (!object.__COMMENTS__.o) {
        object.__COMMENTS__.o = [];
    }
    for (const [name, value] of Object.entries(object)) {
        if (!object.__COMMENTS__.o.includes(name)) { object.__COMMENTS__.o.push(name); }
        if (!object.__COMMENTS__.c[name]) { object.__COMMENTS__.c[name] = ["", ""]; }
        if (object[name + "__commentBefore__"]) {
            const lines = object[name + "__commentBefore__"].split("\n");
            let comment: string|undefined;
            // Check that every line of comment begins with a correct character
            for (let line of lines as string[]) {
                line = line.trim() || "";
                if (!regex.test(line)) {
                    line = "# " + line;
                }
                if (comment === undefined) {
                    comment = "  ".repeat(level) + line;
                } else {
                    comment += "\n" + "  ".repeat(level) + line;
                }
            }
            object.__COMMENTS__.c[name][0] = comment;
        }
        if (object[name + "__commentAfter__"]) {
            const lines = object[name + "__commentAfter__"].split("\n");
            let comment: string|undefined;
            // Check that every line of comment begins with a correct character
            for (let line of lines as string[]) {
                line = line.trim() || "";
                if (!regex.test(line)) {
                    line = "# " + line;
                }
                if (comment === undefined) {
                    comment = "  ".repeat(level) + line;
                } else {
                    comment += "\n" + "  ".repeat(level) + line;
                }
            }
            object.__COMMENTS__.c[name][1] = comment;
        }
        if (Array.isArray(value)) {
            if (!(value as any).__COMMENTS__) {
                Object.defineProperty(value, "__COMMENTS__", { enumerable: false, writable: true });
                (value as any).__COMMENTS__ = {};
            }
            if (!(value as any).__COMMENTS__.a) {
                (value as any).__COMMENTS__.a = [];
            }
            for (const [index, item] of value.entries()) {
                if (!(value as any).__COMMENTS__.a[index]) {
                    (value as any).__COMMENTS__.a[index] = [];
                }
                // TODO process comments inside array
                if (typeof item === "object") {
                    getComments(value, level + 1);
                }
            }
        } else if (typeof value === "object") {
            getComments(value, level + 1);
        }
    }
};

export const Serializer = {
    extension : ".hjson",
    parse(text: string) {
        const data = Hjson.parse(text, { keepWsc: true });
        setComments(data);
        return data;
    },
    stringify(data: any) {
        getComments(data);
        return Hjson.stringify(data, { keepWsc: true });
    },
};