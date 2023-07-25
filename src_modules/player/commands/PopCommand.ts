import { Command, IExecutionContext } from "../../..";
import PlayerModule from "..";
import { musicPopPhrase, musicEmptyQueuePhrase, musicNoVoicePhrase, musicNotPlayingPhrase, musicWrongVoicePhrase } from "../phrases";
import { getVoiceConnection } from "discord.js"; // Update this line with the correct import statement

export class PopCommand extends Command<[]> {
    private player: PlayerModule;

    public constructor(player: PlayerModule) {
        super(
            {
                allowedPrivileges: ["everyone"],
                author: "extcord",
                description: "Remove the last item from the player queue",
                globalAliases: ["pop"],
                name: "pop",
            },
            [],
        );
        this.player = player;
    }

    public async execute(context: IExecutionContext<[]>) {
        const guild = context.guild.guild;
        const voiceChannel = context.member.member.voice.channel;
        if (!voiceChannel) {
            return context.respond(musicNoVoicePhrase, {});
        }
        const connection = getVoiceConnection(guild.id);
        if (!connection || connection.state.status !== "ready" || !connection.state.subscription) {
            return context.respond(musicNotPlayingPhrase, {});
        }
        if (!voiceChannel.members.get(context.bot.client!.user!.id)) {
            return context.respond(musicWrongVoicePhrase, {});
        }
        const result = this.player.popQueue(guild);
    
        if (result) {
            return context.respond(musicPopPhrase, {});
        } else {
            return context.respond(musicEmptyQueuePhrase, {});
        }
    }
}