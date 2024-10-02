const { BasicSpawnPolicy } = require("./BasicClasses");
const { BuilderMachine } = require("./BuilderMachine");
const { BuilderCreepType, MinerCreepType } = require("./CreepTypes");
const { MinerMachine } = require("./MinerMachine");
const { Utils } = require("./Utils");

class SpawnPolicy {
    /* Builder is the one who mainly do transfer/build/repair, and it can harvest if there is no container */
    static spawn_what(room_name) {
        /* TODO: optimize it */
        var room = Game.rooms[room_name]

        /* if room energy < 200 spawn nothing */
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
}

module.exports = {SpawnPolicy, MinerCreepType, BuilderCreepType}