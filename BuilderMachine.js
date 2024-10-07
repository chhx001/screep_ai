const { OP_DONE, OP_AGAIN_NEXT } = require("./BasicClasses");
const { CreepMachine, CreepOp } = require("./CreepMachine");
const { SpawnOp } = require("./SpawnMachine");


class BuilderMachine extends CreepMachine{

    static do_schedule(creep) {
        /* TODO: Renew */
        var target_list;

        if (creep.obj.ticksToLive < 150 && creep.obj.memory.user.renew_rejected == true) {
            /* in case multiple spawns in the room, find a closest */
            var target = creep.obj.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: (s) => {s.structureType == STRUCTURE_SPAWN}})
            if (target) {
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_RENEW, {target_id:target_id})
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT
            }
        }
        
        /* if empty, see if any container has sources stored */
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            target_list = creep.obj.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity > 0)}})
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
                return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN) &&
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

            /* tower is low priority */
            filter = (structure) => {
                return (structure.structureType == STRUCTURE_TOWER) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > structure.getCapacity(RESOURCE_ENERGY) * 0.2;
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

        /* for builder, harvest is the lowst priority */
        if (creep.obj.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            target_list = creep.obj.room.find(FIND_SOURCES_ACTIVE)
            if (target_list.length > 0) {
                target_id_list = _.map(target_list, (t)=>{return t.id})
                var op = CreepOp.generate(CreepOp.CREEP_OPCODE_HARVEST, {target_id_list:target_id_list})
                creep.pq.push(op, 0)
                return OP_AGAIN_NEXT;
            }
        }
        creep.obj.say("Idle")
        return OP_DONE;
    }

}

module.exports = {BuilderMachine}
