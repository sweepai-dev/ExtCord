import { Command, IExecutionContext } from "../../..";
import PlayerModule from "..";
import { musicPopPhrase, musicEmptyQueuePhrase, musicNoVoicePhrase, musicNotPlayingPhrase, musicWrongVoicePhrase } from "../phrases";
import { VoiceConnection, getVoiceConnection } from "discord.js"; // Update this line with the correct import statement

...

public async execute(context: IExecutionContext<[]>) {
    const guild = context.guild.guild;
    const voiceChannel = context.member.member.voice.channel;
    if (!voiceChannel) {
        return context.respond(musicNoVoicePhrase, {});
    }
    const connection: VoiceConnection | null = getVoiceConnection(guild.id);
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