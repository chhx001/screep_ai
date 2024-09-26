const Logger = require("./Logger");
const PrioritizedQueue = require("./PrioritizedQueue");

const OP_DONE = 0;
const OP_AGAIN_NEXT = 1;

const CreepOp = {
    CREEP_OPCODE_MOVE            : 0x1000,
    CREEP_OPCODE_HARVEST         : 0x1001,
    CREEP_OPCODE_TRANSFER        : 0x1002,
    CREEP_OPCODE_UPGRADE         : 0x1003,
    CREEP_OPCODE_BUILD           : 0x1004,
    CREEP_OPCODE_REPAIR          : 0x1005,

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

    op_assign_move_pos(creep ,op, target_id, x, y, room) {
        creep.obj.memory._move = {}
        op.move = {
            x: x,
            y: y,
            room: room,
            range: 0,
        }
        op.target_id = target_id;
    },
}



class BasicMachine {
    static run(creep) {
        Logger._warn(creep, "I'm unknown, idling...")
    }

    static schedule(creep) {

    }
}

class CreepMachine extends BasicMachine {
    static harvest(creep, op) {
        creep.obj.say("Harvest")
        if (creep.obj.store.getFreeCapacity() > 0) {
            /* confirm the target */
            var target;
            if (op.target_id == undefined) {
                /* time hash to ramomize source usage */
                var source_data = creep.obj.room.memory.user.resources.sources
                var harvest_cnt = source_data.harvest_cnt
                var stance_list = []
                for (var i = 0; i < op.target_id_list.length; i ++) {
                    var eid = op.target_id_list[i]
                    stance_list = stance_list.concat(source_data.dict[eid].stances)
                }
                var stance = stance_list[harvest_cnt % stance_list.length]
                
                CreepOp.op_assign_move(creep, op, stance.target_id, 1);
                op.target_id = stance.target_id
                source_data.harvest_cnt ++
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
                Logger.warn(creep, "Transfer return undefined error code: " + r + " target_id=" + target.id)
            }

            return OP_DONE;
        } else {
            /* if no target, pop*/
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }

    }

    static upgrade(creep, op) {
        creep.obj.say("Upgrade")
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            var target = creep.obj.room.controller
            if (op.target_id == undefined) {
                CreepOp.op_assign_move(creep, op, target.id, 3);
                op.target_id == target.id
            }

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
        creep.obj.say("Build")
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (op.target_id == undefined) {
                /* hash it by time, random pick one */
                op.target_id = op.target_id_list[(Game.time % op.target_id_list.length)]
                CreepOp.op_assign_move(creep, op, op.target_id, 2);
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
                Logger.warn(creep, "Build return undefined error code: " + r + " target_id=" + target.id)
            }

            return OP_DONE;
        } else {
            /* if no target, pop*/
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }
    }

    static repair(creep, op) {
        creep.obj.say('repair')
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (op.target_id == undefined) {
                /* hash it by time, random pick one */
                op.target_id = op.target_id_list[(Game.time % op.target_id_list.length)]
                CreepOp.op_assign_move(creep, op, op.target_id);
            }

            var target = Game.getObjectById(op.target_id)
            if (!target) {
                /* site is gone, repair over */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }
            if (target.hits / target.hitsMax > 0.8) {
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }
            var r = creep.obj.repair(target)
            if (r == ERR_NOT_IN_RANGE) {
                return WorkerMachine.move(creep, op)
            } else if (r == ERR_INVALID_TARGET) {
                /* cancel this target, try again */
                creep.pq.pop();
                return OP_AGAIN_NEXT;
            }else if (r != OK) {
                Logger.warn(creep, "Repair return undefined error code: " + r + " target_id=" + target.id)
            }

            return OP_DONE;
        } else {
            /* if no target, pop*/
            creep.pq.pop();
            return OP_AGAIN_NEXT;
        }
    }

    static do_schedule(creep) {
        creep.say("NoSched");
        return OP_DONE;
    }

    static schedule(creep) {
        var op = creep.pq.top();
        if (op == null) {
            creep.machine.do_schedule(creep)
        }
    }

    static run(creep) {
        var cycle = 1;  /* how many loops left */
        var barrer = 10
        while (cycle -- && barrer --) {
            var op = creep.pq.top()
            if (!op) {
                /* reschedule */
                cycle +=  creep.machine.do_schedule(creep)
            } else {
                switch(op.code) {
                    case CreepOp.CREEP_OPCODE_MOVE:
                        cycle += creep.machine.move(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_TRANSFER:
                        cycle +=creep.machine.transfer(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_HARVEST:
                        cycle +=creep.machine.harvest(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_UPGRADE:
                        cycle +=creep.machine.upgrade(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_BUILD:
                        cycle +=creep.machine.build(creep, op)
                        break;
                    case CreepOp.CREEP_OPCODE_REPAIR:
                        cycle +=creep.machine.repair(creep, op)
                        break;
                    default:
                        Logger.error(creep, "Unknown opcode " + op.code)
                        creep.pq.pop()
                        break;
                }
            }

        }
        if (barrer <= 0) {
            Logger.error(creep, "Barrer reduced to 0!")
        }
    }
}


class WorkerMachine extends CreepMachine{

    static do_schedule(creep) {
        /* TODO: Renew */
        var target_list;
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

            /* TODO: build, alway closet*/
            if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {

                /* emergency upgrade to avoid downgrade */
                if (creep.obj.room.controller.ticksToDowngrade < 1000) {
                    var op = CreepOp.generate(CreepOp.CREEP_OPCODE_UPGRADE, {})
                    creep.pq.push(op, 0)
                    return OP_AGAIN_NEXT
                }

                /* maintain/repair if there are dangerous structures which belows 20% hits */
                var filter = (s) => {
                    return (s.hitsMax > 0 && (s.hits / s.hitsMax < 0.2));
                }
                target = creep.obj.pos.findClosestByRange(FIND_STRUCTURES, {filter: filter});
                if (target) {
                    var target_id_list = [target.id]
                    var op = CreepOp.generate(CreepOp.CREEP_OPCODE_REPAIR, {
                        target_id_list: target_id_list});
                    creep.pq.push(op, 0)
                    return OP_AGAIN_NEXT
                }

                /* build */
                var target = creep.obj.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES)
                if (target) {
                    var target_id_list = [target.id]
                    var op = CreepOp.generate(CreepOp.CREEP_OPCODE_BUILD, {
                        target_id_list: target_id_list});
                    creep.pq.push(op, 0)
                    return OP_AGAIN_NEXT
                }

                /* nothing to do upgrade */
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_UPGRADE, {})
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT
            }

        }
        creep.obj.say("Idle")
        return OP_DONE;
    }

}




const CreepTypes = {
    Worker : {name:"Worker", machine:WorkerMachine},
    Unknown : {name:"Unknown", machine:BasicMachine},
}


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
        if (this.obj.getActiveBodyparts(WORK) > 0) {
            this.type = CreepTypes.Worker.name
            this.machine = CreepTypes.Worker.machine
        } else {
            Logger.warn(this, "Get an unknown creep type")
            this.type = CreepTypes.Unknown.name
            this.machine = CreepTypes.Unknown.machine
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

module.exports = {
    CreepClass,
    CreepTypes
}