const { CreepTypes } = require("./CreepMachine")
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
    WORKER_LIMIT : 6,
};

class SpawnClass {
    
    constructor(name) {
        this.obj = Game.spawns[name]
        this.name = name
        this.MODULE_NAME = name;
    }

    try_spawn_worker() {
        /* if energy is not full, skip */
        var room = this.obj.room;
        if (room.energyAvailable != room.energyCapacityAvailable)
            return;

        /* counter worker */
        var creep_list = this.obj.room.find(FIND_MY_CREEPS);
        var count = 0;
        for (var i in creep_list) {
            var creep  = creep_list[i]
            if (creep.memory.user && creep.memory.user.type && creep.memory.user.type == CreepTypes.WORKER.name) {
                count ++;
            }
        }
        Logger.debug(this, "worker count="+count)
        if (count < SpawnClassOptions.WORKER_LIMIT) {
            var creep_name = NameGen.gen(CreepTypes.WORKER.name)
            var r = this.obj.spawnCreep(WorkerDesigner.generate(room.energyAvailable), creep_name, {memory:{user:{type:CreepTypes.WORKER.name}}});
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
        this.try_spawn_worker();
    }
    
    
    
}

module.exports = {
    SpawnClass,
}