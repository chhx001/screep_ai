const { BasicMachine } = require("./BasicMachine")

const OP_DONE = 0;
const OP_AGAIN_NEXT = 1;

const RoomTowerOption = {
    max_queue_priority : 1,
    queue_size_list : [2]
}

const TowerOp = {
    TOWER_OPCODE_REPAIR          : 0x3000,
    TOWER_OPCODE_ATTACK          : 0x3001,
    TOWER_OPCODE_HEAL            : 0x3002,
    
    generate(opcode, params) {
        var ret = {}
        ret.code = opcode
        for (var p in params) {
            ret[p] = params[p]
        }
        return ret;
    },
}

class TowerMachine extends BasicMachine {
    static repair(tower, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            if (target.hits < target.hitMax * 0.9) {
                for (var i = 0;i < this.tower_list.length; i ++) {
                    var tower = this.tower_list[i]
                    if (tower.energy > 0) {
                        var r = tower.repair(target)
                    }
                }
                return OP_DONE
            } 

        }
        /* no target or this target is almost repaired */
        if (op.cur_target_index < op.target_id_list.length - 1) {
            op.cur_target_index ++
            return OP_AGAIN_NEXT
        } else {
            this.pq.pop()
            return OP_AGAIN_NEXT
        }
    }
    static attack(tower, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            /* if target still in this room */
            if (target.room == tower.room) {
                for (var i = 0;i < this.tower_list.length; i ++) {
                    var tower = this.tower_list[i]
                    if (tower.energy > 0) {
                        var r = tower.attack(target)
                    }
                }
                return OP_DONE
            } 

        }
        /* no target or this target is almost repaired */
        if (op.cur_target_index < op.target_id_list.length - 1) {
            op.cur_target_index ++
            return OP_AGAIN_NEXT
        } else {
            this.pq.pop()
            return OP_AGAIN_NEXT
        }
    }
    static heal(tower, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            /* for heal, we do until fully healed */
            if (target.hits < target.hitMax) {
                for (var i = 0;i < this.tower_list.length; i ++) {
                    var tower = this.tower_list[i]
                    if (tower.energy > 0) {
                        var r = tower.heal(target)
                    }
                }
                return OP_DONE
            } 

        }
        /* no target or this target is almost repaired */
        if (op.cur_target_index < op.target_id_list.length - 1) {
            op.cur_target_index ++
            return OP_AGAIN_NEXT
        } else {
            this.pq.pop()
            return OP_AGAIN_NEXT
        }
    }

    static do_schedule(tower) {
        /* prioroty: attack, heal, repair */
        /* attack */
        var hos_creep_list = this.room.find(FIND_HOSTILE_CREEPS)
        var hos_pw_creep_list = this.room.find(FIND_HOSTILE_POWER_CREEPS)
        var target_id_list = [];
        /* TODO: filter creeps, priority long ranged > power > ranged > attack > others */
        if (hos_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(hos_creep_list, (t)=>{return t.id}))
        }
        if (hos_power_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(hos_pw_creep_list, (t)=>{return t.id}))
        }
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TOWER_OPCODE_ATTACK, {target_id_list:target_id_list}))
            return OP_AGAIN_NEXT
        }

        /* heal */
        var damaged_creep_list = this.room.find(FIND_MY_CREEPS, {filter:(c) => {return c.hits < c.hitMax}})
        var damaged_pw_creep_list = this.room.find(FIND_MY_POWER_CREEPS, {filter:(c) => {return c.hits < c.hitMax}})
        
        if (damaged_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(damaged_creep_list, (t)=>{return t.id}))
        }
        if (damaged_pw_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(damaged_pw_creep_list, (t)=>{return t.id}))
        }
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TOWER_OPCODE_HEAL, {target_id_list:target_id_list}))
            return OP_AGAIN_NEXT
        }

        /* tower's room will not have hostile structures, and to find road, here use FIND_STRUCTURES*/
        /* tower repair from 40% */
        var damaged_structure_list = this.room.find(FIND_STRUCTURES, {filter:(s) => {return s.hits < s.hitMax * 0.4}})
        target_id_list = _.map(damaged_structure_list, (t)=>{return t.id})
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TOWER_OPCODE_REPAIR, {target_id_list:target_id_list}))
            return OP_AGAIN_NEXT
        }

        /* nothing to do, idle */
        return OP_DONE
    }

    static schedule(tower) {
        var op = tower.pq.top();
        if (op == null) {
            tower.machine.do_schedule(tower)
        }
    }

    static run(tower) {
        var cycle = 1;  /* how many loops left */
        var barrer = 10
        while (cycle -- && barrer --) {
            var op = tower.pq.top()
            /* TODO: hostile reaction */
            if (!op) {
                /* reschedule */
                cycle += tower.machine.do_schedule(tower)
            } else {
                switch(op.code) {
                    case TowerOp.TOWER_OPCODE_ATTACK:
                        cycle += tower.machine.attack(tower, op)
                        break;
                    case TowerOp.TOWER_OPCODE_REPAIR:
                        cycle +=tower.machine.repair(tower, op)
                        break;
                    case TowerOp.TOWER_OPCODE_HEAL:
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

/* generally all tower in the same room do same thing at a tick */
class RoomTowerClass {
    constructor(room_name) {
        this.MODULE_NAME = "Tower in " + room_name
        this.room_name = room_name
        this.room = Game.rooms[room_name]
        this.tower_list = this.room.find(FIND_MY_STRUCTURES, {filter:(s) => {return s.structureType == STRUCTURE_TOWER}})

        /* init memory */
        if (this.room.memory.user == undefined) {
            this.room.memory.user = {}
        }
        if (this.room.memory.user.towers == undefined) {
            this.room.memory.user.towers = {}
        }
        this.memory_entry = this.room.memory.user.towers

        if (this.memory_entry.pq == undefined) {
            this.memory_entry.pq = {}
            this.pq = new PrioritizedQueue(this.memory_entry.pq)
            
            this.pq.init(RoomTowerOption.max_queue_priority, RoomTowerOption.queue_size_list, this.MODULE_NAME)
            this.pq.save()
        } else {
            this.pq = new PrioritizedQueue(this.memory_entry.pq)
            this.pq.load()
        }
        
        this.machine = TowerMachine
        this.op_task_map = {}
        this.op_task_map[TOWER_OPCODE_ATTACK] = TowerMachine.attack
        this.op_task_map[TOWER_OPCODE_HEAL] = TowerMachine.heal
        this.op_task_map[TOWER_OPCODE_REPAIR] = TowerMachine.repair
    }


}

module.exports = {}