const { BasicMachine } = require("./BasicClasses");
const { CpuManager } = require("./CpuManager");
const Logger = require("./Logger");
const PrioritizedQueue = require("./PrioritizedQueue");


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
    static repair(room_towers, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            if (target.hits < target.hitsMax * 0.9) {
                for (var i = 0;i < room_towers.tower_list.length; i ++) {
                    var tower = room_towers.tower_list[i]
                    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
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
            room_towers.pq.pop()
            return OP_AGAIN_NEXT
        }
    }
    static attack(room_towers, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            /* if target still in this room */
            if (target.room == room_towers.room) {
                for (var i = 0;i < room_towers.tower_list.length; i ++) {
                    var tower = room_towers.tower_list[i]
                    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
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
            room_towers.pq.pop()
            return OP_AGAIN_NEXT
        }
    }
    static heal(room_towers, op) {
        /* for tower, we may have multiple target, to reduce CPU cost
         * deal with them in group */
        if (op.cur_target_index == undefined)
            op.cur_target_index = 0
        var target_id = op.target_id_list[op.cur_target_index]
        var target = Game.getObjectById(target_id)
        if (target) {
            /* for heal, we do until fully healed */
            if (target.hits < target.hitsMax) {
                for (var i = 0;i < room_towers.tower_list.length; i ++) {
                    var tower = room_towers.tower_list[i]
                    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
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
            room_towers.pq.pop()
            return OP_AGAIN_NEXT
        }
    }

    static do_schedule(tower) {
        /* prioroty: attack, heal, repair */
        /* attack */
        var hos_creep_list = tower.room.find(FIND_HOSTILE_CREEPS)
        var hos_pw_creep_list = tower.room.find(FIND_HOSTILE_POWER_CREEPS)
        var target_id_list = [];
        /* TODO: filter creeps, priority long ranged > power > ranged > attack > others */
        if (hos_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(hos_creep_list, (t)=>{return t.id}))
        }
        if (hos_pw_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(hos_pw_creep_list, (t)=>{return t.id}))
        }
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TowerOp.TOWER_OPCODE_ATTACK, {target_id_list:target_id_list}), 0)
            return OP_AGAIN_NEXT
        }

        /* heal */
        var damaged_creep_list = tower.room.find(FIND_MY_CREEPS, {filter:(c) => {return c.hits < c.hitsMax}})
        var damaged_pw_creep_list = tower.room.find(FIND_MY_POWER_CREEPS, {filter:(c) => {return c.hits < c.hitsMax}})
        
        if (damaged_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(damaged_creep_list, (t)=>{return t.id}))
        }
        if (damaged_pw_creep_list.length > 0) {
            target_id_list = target_id_list.concat(_.map(damaged_pw_creep_list, (t)=>{return t.id}))
        }
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TowerOp.TOWER_OPCODE_HEAL, {target_id_list:target_id_list}), 0)
            return OP_AGAIN_NEXT
        }

        /* tower's room will not have hostile structures, and to find road, here use FIND_STRUCTURES*/
        /* tower repair from 40% */
        var damaged_structure_list = tower.room.find(FIND_STRUCTURES, {filter:(s) => {return s.hits < s.hitsMax * 0.4}})
        target_id_list = _.map(damaged_structure_list, (t)=>{return t.id})
        if (target_id_list.length > 0) {
            tower.pq.push(TowerOp.generate(TowerOp.TOWER_OPCODE_REPAIR, {target_id_list:target_id_list}), 0)
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
                var i;
                for (i = 0; i < tower.op_task_map.length; i ++) {
                    if (tower.op_task_map[i].code == op.code) {
                        cycle += tower.op_task_map[i].cb(tower, op)
                        break;
                    }
                }
                if (i == tower.op_task_map.length) {
                    Logger.error(tower, "Unknown opcode " + op.code)
                    tower.pq.pop()
                    break;
                }
            }

        }
        if (barrer <= 0) {
            Logger.error(tower, "Barrer reduced to 0!")
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
        this.op_task_map = []
        this.op_task_map.push({code: TowerOp.TOWER_OPCODE_ATTACK, cb: TowerMachine.attack})
        this.op_task_map.push({code: TowerOp.TOWER_OPCODE_HEAL, cb: TowerMachine.heal})
        this.op_task_map.push({code: TowerOp.TOWER_OPCODE_REPAIR, cb: TowerMachine.repair})
    }

    schedule() {
        if (CpuManager.agree())
            this.machine.schedule(this)
    }

    run() {
        if (CpuManager.agree())
            this.machine.run(this)
    }


}

module.exports = {RoomTowerClass}