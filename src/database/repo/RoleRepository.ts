import { Role } from "discord.js";
import { EntityRepository, Repository } from "typeorm";

import { RoleEntity } from "../entity/RoleEntity";
import { GuildRepository } from "./GuildRepository";

@EntityRepository(RoleEntity)
export class RoleRepository extends Repository<RoleEntity> {
    public async getEntity(role: Role) {
        let entity = await this.findOne({ where: { guildId: role.guild.id, roleId: role.id } });
        if (!entity) {
            const guild = await this.manager.getCustomRepository(GuildRepository).getEntity(role.guild);
            entity = await this.create({
                guild,
                name: role.name,
                roleId: role.id,
            });
            await this.save(entity);
        }
        return entity;
    }
}