import { ConfigEntryGroup } from "../config/entry/entrygroup";
import { IPermissionInfo, Permission } from "./permission";
import { Permissions } from "./permissions";

export class PermissionGroup extends Permission {
    public children: Map<string, Permission>;

    constructor(info: IPermissionInfo, children?: Permission[]) {
        const configs = [];
        if (children) {
            for (const child of children) {
                configs.push(child.getConfigEntry());
            }
        }
        super(info, false, new ConfigEntryGroup({
            description: info.description,
            name: info.name,
        }, configs));
        this.children = new Map();
        if (children) {
            for (const child of children) {
                child.registerParent(this);
                this.children.set(child.name, child);
            }
        }
    }

    public addPermission(permission: Permission) {
        (this.getConfigEntry() as ConfigEntryGroup).addEntry(permission.getConfigEntry());
        permission.registerParent(this);
        this.children.set(permission.name, permission);
    }

    public removePermission(permission: Permission) {
        if (this.children.has(permission.name)) {
            (this.getConfigEntry() as ConfigEntryGroup).removeEntry(permission.getConfigEntry());
            permission.unregisterParent(this);
            this.children.delete(permission.name);
        }
    }

    public updateFullName() {
        super.updateFullName();
        for (const [, child] of this.children) {
            child.updateFullName();
        }
    }

    public register(permissions: Permissions) {
        super.register(permissions);
        for (const [, child] of this.children) {
            child.registerPermissions(permissions);
        }
    }

    public unregister() {
        super.unregister();
        for (const [, child] of this.children) {
            child.unregisterPermissions();
        }
    }
}
