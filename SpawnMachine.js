const { SpawnPolicy } = require("./CreepSpawnPolicy")
const Logger = require("./Logger")

class NameGen {
    static gen(prefix) {
        return prefix + Game.time
    }
}

const WorkerDesigner = {
    HEAD_DESIGN : [],
    BODY_DESIGN : [WORK, CARRY, MOVE],
    TAIL_DESIGN : [MOVE],

    generate(energy) {
        var ret = Array()
        var energy_used = 0
        for (var i in this.HEAD_DESIGN) {
            ret.push(this.HEAD_DESIGN[i])
            energy_used += BODYPART_COST[HEAD_DESIGN[i]]
        }
        

        for (var i = 0; energy > energy_used; i = (i + 1) %(this.BODY_DESIGN.length)) {
            var part = this.BODY_DESIGN[i]
            if (energy - energy_used > BODYPART_COST[part]) {
                ret.push(part)
                energy_used += BODYPART_COST[part]
            } else {
                break;
            }
            
        }

        for (var i = 0; energy > energy_used; i = (i + 1) %(this.TAIL_DESIGN.length)) {
            var part = this.TAIL_DESIGN[i]
            if (energy - energy_used > BODYPART_COST[part]) {
                ret.push(part)
                energy_used += BODYPART_COST[part]
            } else {
                break;
            }
        }
        return ret;
    }
}

const SpawnClassOptions = {
    WORKER_LIMIT : 8,
};

class SpawnClass {
    
    constructor(name) {
        this.obj = Game.spawns[name]
        this.name = name
        this.MODULE_NAME = name;
    }

    try_spawn() {
        var room = this.obj.room
        var creep_type = SpawnPolicy.spawn_what(room.name)
        if (creep_type) {
            var creep_name = NameGen.gen(creep_type.name)
            Memory.user.cache = creep_type.name
            var r = this.obj.spawnCreep(creep_type.design(room.name), creep_name, {memory:{user:{type:Memory.user.cache}}});
            if (r) {
                Logger.warn(this, "Spawn failed, err=" + r);
            } else {
                Logger.info(this, "Spawning Creep " + creep_name)
            }
        }
    }

    is_busy() {
        if (this.obj.spawning)
            return true

        return false
    }

    run() {
        if (this.is_busy())
            return
        this.try_spawn();
    }
    
}

module.exports = {
    SpawnClass,
}