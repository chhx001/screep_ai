const Logger = require("./Logger");
const PrioritizedQueue = require("./PrioritizeQueue");

const OP_DONE = 0;
const OP_AGAIN_NEXT = 1;

const CreepOp = {
    CREEP_OPCODE_MOVE            : 0x1000,
    CREEP_OPCODE_HARVEST         : 0x1001,
    CREEP_OPCODE_TRANSFER        : 0x1002,
    CREEP_OPCODE_UPGRADE         : 0x1003,
    CREEP_OPCODE_BUILD           : 0x1004,

    generate(opcode, params) {
        var ret = {}
        ret.code = opcode
        for (var p in params) {
            ret[p] = params[p]
        }
        return ret;
    },

    op_assign_move(creep ,op, target_id, range = 1) {
        var target = Game.getObjectById(target_id)
        creep.obj.memory._move = {}
        op.move = {
            x: target.pos.x,
            y: target.pos.y,
            room: target.pos.roomName,
            range: range,
        }
        op.target_id = target_id;
    },
}




class UnknownMachine {
    static run() {
        Logger.warn(this.creep, "I'm unknown, idling...")
    }
}

class WorkerMachine {

    static schedule(creep) {
        /* TODO: Renew */
        var target_list;
        Logger.debug(creep, "idle")
        /* if empty go harvest */
        if (creep.obj.store.getUsedCapacity() == 0) {
            target_list = creep.obj.room.find(FIND_SOURCES_ACTIVE)
            if (target_list.length > 0) {
                target_id_list = _.map(target_list, (t)=>{return t.id})
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_HARVEST, {target_id_list:target_id_list})
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT;
            }
        }
        
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0){
            /* any source storage transfer?*/
            var filter = (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
            target_list = creep.obj.room.find(FIND_MY_STRUCTURES, {filter: filter});
            if (target_list.length > 0) {
                var target_id_list = _.map(target_list, (t)=>{return t.id})
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_TRANSFER, {
                    target_id_list: target_id_list,
                    resource_type:RESOURCE_ENERGY});
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT
            }

            /* TODO: build */
            if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                target_list = creep.obj.room.find(FIND_MY_CONSTRUCTION_SITES)
                if (target_list.length > 0) {
                    var target_id_list = _.map(target_list, (t)=>{return t.id})
                    var op = CreepOp.generate(CreepOp.CREEP_OPCODE_BUILD, {
                        target_id_list: target_id_list});
                    creep.pq.push(op, 0)
                    return OP_AGAIN_NEXT
                }
                /* upgrade */
                
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_UPGRADE, {})
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT
            }

        }
        creep.obj.say("Idle")
        return OP_DONE;
    }

    static harvest(creep, op) {
        Logger.debug(creep, "harvest")
        creep.obj.say("Harvest")
        if (creep.obj.store.getFreeCapacity() > 0) {
            /* confirm the target */
            var target;
            if (op.target_id == undefined) {
                /* time hash to ramomize source usage */
                op.target_id = op.target_id_list[Game.time % op.target_id_list.length]
                CreepOp.op_assign_move(creep, op, op.target_id);
            }

            /* harvest */
            target = Game.getObjectById(op.target_id)
            var r = creep.obj.harvest(target)
            if (r == ERR_NOT_IN_RANGE) {
                /* if there is no energy left, reschedule, TODO: adjust other resources*/
                if (target.energy <= 0) {
                    creep.pq.pop();
                    return OP_AGAIN_NEXT;
                } else
                    return WorkerMachine.move(creep, op)
            } else if (r == ERR_NOT_ENOUGH_RESOURCES) {
                /* cancel this target, try again */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            } else if (r != OK) {
                Logger.warn(creep, "Harvest return undefined error code: " + r)
            }
            return OP_DONE;
        } else {
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }
    }

    static move(creep, op) {
        Logger.debug(creep, "move")
        PathFinder.use(true);
        var range = op.range;

        var goal_pos = Game.rooms[op.move.room].getPositionAt(op.move.x, op.move.y)
        var r = creep.obj.moveTo(goal_pos, {noPathFinding:true, visualizePathStyle:{}})
        if (r == ERR_NOT_FOUND) {
            if (creep.obj.pos.getRangeTo(goal_pos) <= op.range) {
                range = 0
            }
            var r = creep.obj.moveTo(goal_pos, {reusePath:10, visualizePathStyle:{}, range:range})
        }

        return OP_DONE;
        
    }

    static transfer(creep, op) {
        Logger.debug(creep, "transfer")
        creep.obj.say("Transfer")
        if (creep.obj.store.getUsedCapacity(op.resource_type) > 0) {
            if (op.target_id == undefined) {
                /* hash it by time */
                op.target_id = op.target_id_list[(Game.time % op.target_id_list.length)]
                CreepOp.op_assign_move(creep, op, op.target_id);
            }

            var target = Game.getObjectById(op.target_id)
            var r = creep.obj.transfer(target, op.resource_type)
            if (r == ERR_NOT_IN_RANGE) {
                if (target.store && target.store.getFreeCapacity == 0) {
                    /* so it can't be transferred, move next */
                    creep.pq.pop();
                    return OP_AGAIN_NEXT;
                }
                return WorkerMachine.move(creep, op)
            } else if (r == ERR_FULL || r == ERR_INVALID_TARGET) {
                /* cancel this target, try again */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }else if (r != OK) {
                Logger.warn(creep, "Transfer return undefined error code: " + r + " target_id=" + op.target_id)
            }

            return OP_DONE;
        } else {
            /* if no target, pop*/
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }

    }

    static upgrade(creep, op) {
        Logger.debug(creep, "upgrade");
        creep.obj.say("Upgrade")
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            var target = creep.obj.room.controller
            if (op.target_id == undefined)
                CreepOp.op_assign_move(creep, op, target.id, 3);

            var r = creep.obj.upgradeController(target)
            if (r == ERR_NOT_IN_RANGE) {
                return WorkerMachine.move(creep, op)
            }
            return OP_DONE;
        } else {
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }
    }

    static build(creep, op) {
        Logger.debug(creep, "build")
        creep.obj.say("Build")
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (op.target_id == undefined) {
                /* hash it by time, random pick one */
                op.target_id = op.target_id_list[(Game.time % op.target_id_list.length)]
                CreepOp.op_assign_move(creep, op, op.target_id);
            }

            var target = Game.getObjectById(op.target_id)
            if (!target) {
                /* site is gone, build over */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }
            var r = creep.obj.build(target)
            if (r == ERR_NOT_IN_RANGE) {
                return WorkerMachine.move(creep, op)
            } else if (r == ERR_INVALID_TARGET) {
                /* cancel this target, try again */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }else if (r != OK) {
                Logger.warn(creep, "Transfer return undefined error code: " + r + " target_id=" + op.target_id)
            }

            return OP_DONE;
        } else {
            /* if no target, pop*/
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }
    }

    static run(creep) {
        var cycle = 1;  /* how many loops left */
        var barrer = 10
        while (cycle -- && barrer --) {
            var op = creep.pq.top()
            if (op == null) {
                cycle +=  WorkerMachine.schedule(creep)
            } else {
                switch(op.code) {
                    case CreepOp.CREEP_OPCODE_MOVE:
                        cycle += WorkerMachine.move(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_TRANSFER:
                        cycle +=WorkerMachine.transfer(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_HARVEST:
                        cycle +=WorkerMachine.harvest(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_UPGRADE:
                        cycle +=WorkerMachine.upgrade(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_BUILD:
                        cycle +=WorkerMachine.build(creep, op)
                    default:
                        Logger.warn(creep, "Unknown opcode " + op.id)
                        break;
                }
            }

        }
        if (barrer <= 0) {
            Logger.error(creep, "Barrer reduced to 0!")
        }
    }
}

const CreepClassOptions = {
    MODULE_NAME : "CreepClass",
    VERSION : 1,
    max_queue_priority : 1,
    queue_size_list : [3],
}

const CreepTypes = {
    WORKER : {name:"Worker", machine:WorkerMachine},
    UNKNOWN : {name:"Unknown", machine:UnknownMachine},
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
        this.identify_type()

    }

    identify_type() {
        if (this.obj.getActiveBodyparts(WORK) > 0) {
            this.type = CreepTypes.WORKER.name
            this.machine = CreepTypes.WORKER.machine
        } else {
            Logger.warn(this, "Get an unknown creep type")
            this.type = CreepTypes.UNKNOWN.name
            this.machine = CreepTypes.UNKNOWN.machine
        }
        this.obj.memory.user.type = this.type
    }

    run() {
        if (!this.obj.spawning) {
            this.machine.run(this);
            this.pq.save();
        }
    }
}

module.exports = {
    CreepClass,
    CreepTypes
}