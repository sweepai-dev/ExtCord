import { Message } from "discord.js";
import { EventEmitter } from "events";
import { readdir } from "fs-extra";
import { resolve } from "path";

import { Bot } from "../Bot";
import { ConfigEntryGroup } from "../config/entry/ConfigEntryGroup";
import { StringGuildConfigEntry } from "../config/entry/guild/StringGuildConfigEntry";
import { DynamicFieldMessagePhrase, TemplateStuffs } from "../language/phrase/DynamicFieldMessagePhrase";
import { MessagePhrase } from "../language/phrase/MessagePhrase";
import { Phrase } from "../language/phrase/Phrase";
import { PhraseGroup } from "../language/phrase/PhraseGroup";
import { ISimpleMap } from "../language/phrase/SimplePhrase";
import { TemplateStuff } from "../language/phrase/TemplatePhrase";
import { Permission } from "../permissions/Permission";
import { PermissionGroup } from "../permissions/PermissionGroup";
import { Logger } from "../util/Logger";
import { BuiltInArguments } from "./arguments/BuiltinArguments";
import { Command } from "./Command";
import { CommandPhrases } from "./CommandPhrases";

// Event definitions
// tslint:disable-next-line:interface-name
export interface Commands {
    /** @event */
    addListener(event: "command", listener: (command: Command<any>, context: ICommandContext) => void): this;
    /** @event */
    emit(event: "command", command: Command<any>, context: ICommandContext): boolean;
    /** @event */
    on(event: "command", listener: (command: Command<any>, context: ICommandContext) => void): this;
    /** @event */
    once(event: "command", listener: (command: Command<any>, context: ICommandContext) => void): this;
    /** @event */
    prependListener(event: "command", listener: (command: Command<any>, context: ICommandContext) => void): this;
    /** @event */
    prependOnceListener(event: "command", listener: (command: Command<any>, context: ICommandContext) => void): this;
}

export class Commands extends EventEmitter {
    public prefixConfigEntry?: StringGuildConfigEntry;
    private bot: Bot;
    private commands: Map<string, Command<any>>;
    private configEntry?: ConfigEntryGroup;
    private permissions: Permission[];
    private permission?: Permission;
    private commandPhrases: Phrase[];
    private commandPhraseGroup?: PhraseGroup;
    private argumentsGroup?: PhraseGroup;
    private phrasesGroup?: PhraseGroup;
    private phraseGroup?: PhraseGroup;

    constructor(bot: Bot) {
        super();
        this.bot = bot;
        this.commands = new Map();
        this.permissions = [];
        this.commandPhrases = [];
    }

    public async message(message: Message) {
        const startTime = process.hrtime();
        if (!message.guild || message.author.bot) { return; } // For now
        const prefix = await this.prefixConfigEntry!.guildGet(message.guild);
        const mention = `<@${message.client.user.id}>`;
        let text;
        if (message.content.startsWith(prefix)) {
            text = message.content.replace(prefix, "").trim();
        } else if (message.content.startsWith(mention)) {
            text = message.content.replace(mention, "").trim();
        } else {
            return;
        }
        const command = text.split(" ", 1)[0];
        const language = await this.bot.languages.getLanguage(message.guild);
        const useEmbeds = await this.bot.languages.useEmbedsConfigEntry!.guildGet(message.guild);
        const useMentions = await this.bot.languages.useMentionsConfigEntry!.guildGet(message.guild);
        const respond: LinkedResponse = async (phrase, stuff, fieldStuff) => {
                let content: string;
                let options;
                if (useEmbeds) {
                    content = "";
                    options = {
                        embed: phrase instanceof DynamicFieldMessagePhrase ?
                            phrase.formatEmbed(language, stuff, fieldStuff) :
                            phrase.formatEmbed(language, stuff),
                    };
                } else {
                    content = phrase instanceof DynamicFieldMessagePhrase ?
                        phrase.format(language, stuff, fieldStuff) : phrase.format(language, stuff);
                    options = undefined;
                }
                if (useMentions) {
                    await message.reply(content, options);
                } else {
                    await message.channel.send(content, options);
                }
            };
        if (!command || !this.commands.has(command)) {
            await respond(CommandPhrases.invalidCommand, { command });
            return;
        }
        const commandInstance = this.commands.get(command)!;
        const passed = text.replace(command, "").trim();
        const context = {
            bot: this.bot,
            command,
            language,
            message,
            passed,
            prefix,
            respond,
        };
        const timeDiff = process.hrtime(startTime);
        Logger.debug(`Command preprocessing took ${((timeDiff[0] * 1e9 + timeDiff[1]) / 1000000).toFixed(3)} ms`);
        Logger.debug(`Executing command ${command}`);
        this.emit("command", commandInstance, context);
        await commandInstance.command(context);
    }

    public registerCommand(command: Command<any>) {
        if (this.commands.has(command.name)) {
            throw new Error(`A command is already registered by the name ${command.name}`);
        }
        this.registerPermission(command.getPermission());
        this.commands.set(command.name, command);
    }

    public unregisterCommand(command: Command<any>) {
        this.unregisterPermission(command.getPermission());
        this.commands.delete(command.name);
    }

    public registerPermission(permission: Permission) {
        this.permissions.push(permission);
    }

    public unregisterPermission(permission: Permission) {
        this.permissions.splice(this.permissions.indexOf(permission), 1);
    }

    public registerPhrase(phrase: Phrase) {
        this.commandPhrases.push(phrase);
    }

    public unregisterPhrase(phrase: Phrase) {
        this.commandPhrases.splice(this.commandPhrases.indexOf(phrase), 1);
    }

    public registerConfig() {
        this.prefixConfigEntry = new StringGuildConfigEntry({
            description: "The prefix for commands",
            name: "prefix",
        }, this.bot.database, "!");
        this.configEntry = new ConfigEntryGroup({
            name: "commands",
        }, [ this.prefixConfigEntry ]);
        this.bot.config.registerEntry(this.configEntry);
    }

    public registerPermissions() {
        this.permission = new PermissionGroup({
            description: "Permissions for command execution",
            name: "commands",
        }, this.permissions);
        this.bot.permissions.registerPermission(this.permission);
    }

    public registerLanguages() {
        this.commandPhraseGroup = new PhraseGroup({
            description: "Built-in commands",
            name: "commands",
        }, this.commandPhrases);
        this.argumentsGroup = new PhraseGroup({
            description: "Built-in arguments",
            name: "arguments",
        }, Object.values(BuiltInArguments).map((arg) => arg.getPhrase()));
        this.phrasesGroup = new PhraseGroup({
            description: "Built-in phrases",
            name: "phrases",
        }, Object.values(CommandPhrases));
        this.phraseGroup = new PhraseGroup({
            name: "commands",
        }, [ this.argumentsGroup, this.commandPhraseGroup, this.phrasesGroup ]);
        this.bot.languages.registerPhrase(this.phraseGroup);
    }

    public async registerCommands() {
        const commands = await readdir(resolve(__dirname, "builtin"));
        for (const filename of commands) {
            const path = resolve(__dirname, "builtin", filename);
            // Skip files that aren't javascript
            if (!path.endsWith(".js")) { continue; }
            const required = require(path);
            for (const value of Object.values(required)) {
                if (value instanceof Command) {
                    Logger.debug(`Found builtin command ${value.name} in file ${filename}`);
                    this.registerCommand(value);
                    this.registerPhrase(value.phraseGroup);
                }
            }
        }
    }

    public getStatus() {
        return `${this.commands.size} commands loaded: ${Array.from(this.commands.keys()).join(", ")}`;
    }
}

export interface ICommandContext {
    bot: Bot;
    prefix: string;
    message: Message;
    command: string;
    passed: string;
    language: string;
    respond: LinkedResponse;
}

export type LinkedResponse = <T extends ISimpleMap, U extends ISimpleMap, V extends ISimpleMap>(
    phrase: MessagePhrase<T> | DynamicFieldMessagePhrase<T, U>,
    stuff: TemplateStuff<T, V>, fieldStuff?: TemplateStuffs<U, V>,
) => Promise<void>;