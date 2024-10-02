const { CreepTypes } = require("./CreepTypes")
const Logger = require("./Logger")
const PrioritizedQueue = require("./PrioritizedQueue")



const CreepClassOptions = {
    MODULE_NAME : "CreepClass",
    VERSION : 1,
    max_queue_priority : 1,
    queue_size_list : [4],
}

class CreepClass {
    constructor(name) {
        this.name = name
        this.obj = Game.creeps[name]
        this.MODULE_NAME = name
        Logger.debug(this, "find " + name)
        // memory
        if (this.obj.memory.user == undefined)
            this.obj.memory.user = {}
        // queue
        
        if (this.obj.memory.user.pq == undefined || this.obj.memory.user.pq.module_name != this.MODULE_NAME) {
            this.obj.memory.user.pq = {}
            this.pq = new PrioritizedQueue(this.obj.memory.user.pq)
            this.pq.init(CreepClassOptions.max_queue_priority, CreepClassOptions.queue_size_list, this.MODULE_NAME)
            this.pq.save()
        } else {
            this.pq = new PrioritizedQueue(this.obj.memory.user.pq)
            this.pq.load()
        }
        
        // type and state machine assignment
        if (this.obj.memory.user.type == undefined) {
            this.identify_type()
        } else {
            this.type = this.obj.memory.user.type
            this.machine = CreepTypes[this.type].machine
        }

    }

    identify_type() {
        for (var name in CreepTypes) {
            if (CreepTypes[name].identify(this)) {
                this.type = name
                break;
            }
                
        }
        this.obj.memory.user.type = this.type
    }

    schedule() {
        if (!this.obj.spawning) {
            this.machine.schedule(this);
            this.pq.save();
        }
    }

    run() {
        if (!this.obj.spawning) {
            this.machine.run(this);
            this.pq.save();
        }
    }
}

module.exports = {CreepClass}