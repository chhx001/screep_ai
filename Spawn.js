

Logger = require("Logger.js")

var PARTS_COST = {
    MOVE: 50,
    WORK: 100,
    CARRY: 50,
    ATTACK: 80,
    RANGED_ATTACK: 150,
    HEAL: 250,
    CLAIM: 600,
    TOUGH: 10,

}

class NameGen {
    static gen(prefix) {
        return prefix + String.valueOf(Game.time)
    }
}

class WorkerDesigner {
    static HEAD_DESIGN = []
    static BODY_DESIGN = [WORK, CARRY, MOVE]
    static TAIL_DESIGN = [MOVE]

    static generate(energy) {
        ret = []
        energy_used = 0
        for (var part in this.HEAD_DESIGN) {
            ret += part
            energy_used += PARTS_COST[part]
        }

        for (var i = 0; energy > energy_used; i = (i + 1) %(this.BODY_DESIGN.length)) {
            part = this.BODY_DESIGN[i]
            if (energy - energy_used > PARTS_COST[part]) {
                ret += part
                energy_used += PARTS_COST[part]
            } else {
                break;
            }
        }

        for (var i = 0; energy > energy_used; i = (i + 1) %(this.TAIL_DESIGN.length)) {
            part = this.TAIL_DESIGN[i]
            if (energy - energy_used > PARTS_COST[part]) {
                ret += part
                energy_used += PARTS_COST[part]
            } else {
                break;
            }
        }

        return ret;
        
    }
}

module.exports = class {
    static MODULE_NAME = "Spawns";
    static VERSION = 1;
    static WORKER_LIMIT = 2;
    static WORKER_BASIC_DESIGN = []
    
    constructor(name) {
        this.spawn = Game.spawns[name]
    }

    try_spawn_worker() {
        /* if energy is not full, skip */
        var room = this.spawn.room;
        if (room.energyAvailable != room.energyCapacityAvailable)
            return;

        /* counter worker */
        var creep_list = spawn.room.find(FIND_MY_CREEPS);
        var count = 0;
        for (var creep in creep_list) {
            if (creep.memory.user && creep.memory.user.style && creep.memory.user.style == "WORKER") {
                count ++;
            }
        }

        if (count < WORKER_LIMIT) {
            var r = this.spawn.spawnCreep(WorkerDesigner.generate(room.energyAvailable), NameGen.gen("WORKER"), {memory:{user:{style:"WORKER"}}});
            if (r) {
                Logger.error(this, "Spawn failed, err=" + r);
            }
        }
    }

    run() {
        try_spawn_worker();
    }
    
    
    
}