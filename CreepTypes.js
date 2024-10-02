const { BuilderMachine } = require("./BuilderMachine")
const { MinerMachine } = require("./MinerMachine")

const BuilderCreepType = {
    UPPER_LIMIT: 6,
    LOWER_LIMIT: 2,
    name: "Builder",
    machine: BuilderMachine,
    design(room_name) {
        var ret = []
        var room = Game.rooms[room_name]
        var energy_left = room.energyAvailable
        /* Level0, WORK, MOVE, CARRY */
        energy_left -= BODYPART_COST[WORK] + BODYPART_COST[MOVE] + BODYPART_COST[CARRY]
        ret.push(WORK)
        ret.push(CARRY)
        ret.push(MOVE)
        /* Level1 part, CARRY, MOVE, CARRY, MOVE, WORK, MOVE */
        var part_cost = BODYPART_COST[WORK] + 3 * BODYPART_COST[MOVE] + 2 * BODYPART_COST[CARRY]
        var limit = 2
        while (energy_left > part_cost && limit --) {
            ret.push(WORK)
            ret.push(MOVE)
            ret.push(MOVE)
            ret.push(MOVE)
            ret.push(CARRY)
            ret.push(CARRY)
            energy_left -= part_cost
        }
        /* Level2 part, CARRY, MOVE */
        var part_cost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE]
        while (energy_left > part_cost) {
            ret.push(MOVE)
            ret.push(CARRY)
            energy_left -= part_cost
        }

        return ret
    },
    identify(creep) {
        if (creep.obj.getActiveBodyParts(WORK) > 0 && 
        creep.obj.getActiveBodyParts(CARRY) >= creep.obj.getActiveBodyParts(WORK))
            return true
        return false
    }
}

const MinerCreepType = {
    name: "Miner",
    machine: MinerMachine,
    design(room_name) {
        var ret = []
        var room = Game.rooms[room_name]
        var energy_left = room.energyAvailable
        /* Level 0, CARRY, CARRY */
        energy_left -= 2 * BODYPART_COST[CARRY]
        ret.push(CARRY)
        ret.push(CARRY)
        /* Level1 part, WORK, MOVE*/
        var part_cost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] 
        /* each source regen 10 per tick,
         * each work parts consumes 2,
         * so no more than 6 work parts other wise will waste */
        var limit = 6;
        while (energy_left > part_cost && limit --) {
            ret.push(WORK)
            ret.push(MOVE)
            energy_left -= part_cost
        }
    },
    identify(creep) {
        if (creep.obj.getActiveBodyParts(WORK) > creep.obj.getActiveBodyParts(CARRY))
            return true
        return false
    }
}

const CreepTypes = {
    "Builder": BuilderCreepType,
    "Miner": MinerCreepType
}

module.exports = {CreepTypes, BuilderCreepType, MinerCreepType}