const { SpawnMachine, SpawnOp } = require("./SpawnMachine")
const Logger = require("./Logger")

const SpawnOption = {
    max_queue_priority : 1,
    queue_size_list : [10]
}

class SpawnClass {
    
    constructor(name, parent) {
        this.obj = Game.spawns[name]
        this.name = name
        this.MODULE_NAME = name;
        this.room = parent
        this.machine = SpawnMachine

        if (this.obj.memory.user == undefined)
            this.obj.memory.user = {}
        this.memory_entry = this.obj.memory.user

        if (this.memory_entry.pq == undefined) {
            this.memory_entry.pq = {}
            this.pq = new PrioritizedQueue(this.memory_entry.pq)
            
            this.pq.init(SpawnOption.max_queue_priority, SpawnOption.queue_size_list, this.MODULE_NAME)
            this.pq.save()
        } else {
            this.pq = new PrioritizedQueue(this.memory_entry.pq)
            this.pq.load()
        }
        
        this.op_task_map = []
        this.op_task_map.push({code: SpawnOp.SPAWN_OP_SPAWN_CREEP, cb: SpawnMachine.spawn_creep})
        this.op_task_map.push({code: SpawnOp.SPAWN_OP_RENEW_CREEP, cb: SpawnMachine.renew_creep})

    }

    try_spawn() {
        var room = this.obj.room
        var creep_type = SpawnMachine.schedule(this)
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
        this.machine.run(this)
    }
    
}

module.exports = {
    SpawnClass,
}