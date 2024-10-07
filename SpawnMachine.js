const { BasicMachine, OP_DONE, OP_AGAIN_NEXT } = require("./BasicClasses");
const { BuilderCreepType, MinerCreepType, CreepTypes } = require("./CreepTypes");
const { Utils } = require("./Utils");

class NameGen {
    static gen(prefix) {
        return prefix + Game.time
    }
}

const SpawnOp = {
    SPAWN_OP_SPAWN_CREEP            : 0x4000,
    SPAWN_OP_RENEW_CREEP            : 0x4001,

    generate(opcode, params) {
        var ret = {}
        ret.code = opcode
        for (var p in params) {
            ret[p] = params[p]
        }
        return ret;
    },
}
class SpawnMachine extends BasicMachine {
    static spawn_creep(spawn, op) {
        if (spawn.obj.spawning)
            return OP_DONE
        creep_type = CreepTypes[op.creep_type]
        if (creep_type) {
            var creep_name = NameGen.gen(creep_type.name)
            Memory.user.cache = creep_type.name
            var r = spawn.obj.spawnCreep(creep_type.design(room.name), creep_name, {memory:{user:{type:Memory.user.cache}}});
            if (r) {
                Logger.warn(this, "Spawn failed, err=" + r);
            } else {
                Logger.info(this, "Spawning Creep " + creep_name)
            }
        } else {
            Logger.warn(spawn, "Unknown creep type " + op.creep_type)
        }
        spawn.pq.pop()
        return OP_DONE
    }

    static renew_creep(spawn, op) {
        if (spawn.obj.spawning)
            return OP_DONE
        if (op.target_id) {
            var target = Game.getObjectById(op.target_id)
            if (target) {
                spawn.obj.renewCreep(target);
                spawn.pq.pop()
                return OP_DONE
            }
            
        }
        /* target does not exist, reschedule*/
        spawn.pq.pop();
        return OP_AGAIN_NEXT
    }

    /* Builder is the one who mainly do transfer/build/repair, and it can harvest if there is no container */
    static schedule(spawn) {
        /* TODO: optimize it */
        var room_name = spawn.obj.room.name
        var room = Game.rooms[room_name]

        /* if room energy < 300 spawn nothing */
        if (room.energyAvailable < 300)
            return null

        var builder_list = room.find(FIND_MY_CREEPS, {filter:(c) => {return c.memory.user.type == BuilderCreepType.name}})
        /* at least 2 builders */
        if (builder_list.length < 2)
            return BuilderCreepType

        /* emergency policy done, then common policy, wait until room energy is full */
        if (room.energyAvailable < room.energyCapacityAvailable)
            return null;

        /* if no containers, need builder to harvest */
        var container_list = room.find(FIND_MY_STRUCTURES, {filter:(s) => {return s.structureType == STRUCTURE_CONTAINER}})
        var source_list = room.find(FIND_SOURCES)
        /* container is not fully built, and builder is less than upper limit */
        if (container_list.length < source_list.length && builder_list.length < BuilderCreepType.UPPER_LIMIT)
            return BuilderCreepType
        /* whether to spawn miner, miner only spawn after containers are deploied */
        if (container_list.length >= source_list.length) {
            /* see if any source is requesting miner, if there is, spawn one */
            var upper_cap = stance_count = 0
            var source_dict = Utils.get_mem("rooms", room_name, "user", "maintain", "resources", "sources", "dict")
            if (source_dict) {
                for (var id in source_dict) {
                    var need_miner = Utils.get_mem("rooms", room_name, "user", "maintain", "resources", "sources", "dict", id, "need_miner")
                    if (need_miner > 0) {
                        /* generating miner, don't request anymore */
                        this.room.memory.user.maintain.resources.sources.dict[id].need_miner = 0
                        return MinerCreepType
                    }
                }
            }
        }

        /* if any container is almost full, spawn a builder */
        for (var i = 0; i < container_list.length; i++) {
            var container = container_list[i]
            if (container.store.getUsedCapacity(RESOURCE_ENERGY) > container.store.getCapacity(RESOURCE_ENERGY) * 0.9)
                return BuilderCreepType
        }

        return null
    }

    static run(spawn) {
        var cycle = 1;  /* how many loops left */
        var barrer = 10
        while (cycle -- && barrer --) {
            var op = spawn.pq.top()
            /* TODO: hostile reaction */
            if (!op) {
                /* reschedule */
                cycle += spawn.machine.do_schedule(spawn)
            } else {
                var i;
                for (i = 0; i < spawn.op_task_map.length; i ++) {
                    if (spawn.op_task_map[i].code == op.code) {
                        cycle += spawn.op_task_map[i].cb(spawn, op)
                        break;
                    }
                }
                if (i == spawn.op_task_map.length) {
                    Logger.error(spawn, "Unknown opcode " + op.code)
                    spawn.pq.pop()
                    break;
                }
            }

        }
        if (barrer <= 0) {
            Logger.error(spawn, "Barrer reduced to 0!")
        }
    }
}

module.exports = {SpawnMachine, SpawnOp}