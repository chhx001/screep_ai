var Set = require('ArraySet')
var Route = require('Route')

var Harvest = {
    RESOURCE_WORKER_LIMIT: 3,
    getResourceToHarvest: (creep) => {
        var resource_list = creep.room.find(FIND_SOURCES)
        if (resource_list.length > 0) {
            for (var no in resource_list) {
                var resource = resource_list[no]
                if (!Memory.resources[resource.id]) {
                    Memory.resources[resource.id] = {}
                }
                if (!Memory.resources[resource.id].worker_id_list ||
                    Set.getLength(Memory.resources[resource.id].worker_id_list) < Harvest.RESOURCE_WORKER_LIMIT ||
                    Set.exist(Memory.resources[resource.id].worker_id_list, creep.id)) {
                    if (Route.isRouteSafe(resource.room, creep.pos, resource.pos))
                        return resource
                }
            }
        }
        return null
    },
    run : (creep) => {
        if (creep.carry.energy < creep.carryCapacity) {
            var resource = null
            // go harvest
            creep.memory.status = "working"
            // first time, so assign a resource
            if (!creep.memory.target_id) {
                resource = Harvest.getResourceToHarvest(creep)
                if (resource) {
                    creep.memory['target_id'] = resource.id
                    if (!Memory.resources[resource.id].worker_id_list) {
                        Memory.resources[resource.id]["worker_id_list"] = [creep.id]
                    }
                    else
                        Set.add(Memory.resources[resource.id].worker_id_list,creep.id)
                }
            }
            else {
                // already has resource, pick it up
                resource = Game.getObjectById(creep.memory.target_id)
            }
            // got resource, harvest
            if (resource) {
                if (creep.harvest(resource) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(resource)
                }
            }
            
        }
        // save a tick to do another work
        if (creep.carry.energy >= creep.carryCapacity)
        {
            creep.memory.status = "done"
            if (creep.memory.target_id) {
                var resource = Game.getObjectById(creep.memory.target_id)
                // remove this creep from resourcing worker list, so that other workers can harvest it
                Set.remove(Memory.resources[resource.id].worker_id_list,creep.id)
                delete creep.memory['target_id']
            }
        }
    },
    
}

var Fill = {
    getContainerToFill: (creep) => {
        var container_list = creep.room.find(FIND_MY_STRUCTURES, {filter:(s)=>{
            return (s.structureType == STRUCTURE_SPAWN ||
                    s.structureType == STRUCTURE_EXTENSION ||
                    s.structureType == STRUCTURE_TOWER) && s.energy < s.energyCapacity
        }})
        if (container_list.length)
            return container_list[0]
        else
            return null
    },
    run: (creep) => {
        if (creep.carry.energy == 0) {
            // no energy, can't fill, work done
            creep.memory.status = 'done'
            return
        }
        
        var target = Fill.getContainerToFill(creep)
        if (!target) {
            // nothing to fill, work has done
            creep.memory.status = 'done'
            return
        } else {
            creep.memory.status = 'working'
            if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
            } else {
                // transfered, if no energy left, done
                if (creep.carry.energy == 0) {
                    creep.memory.status = 'done'
                }
            }
        }
    }
}

var Update = {
    run: (creep) => {
        if (creep.carry.energy == 0) {
            // no energy, can't upgrade, work done
            creep.memory.status = 'done'
            return
        }
        
        var target = creep.room.controller
        if (!target) {
            // nothing to fill, work has done
            creep.memory.status = 'done'
            return
        } else {
            creep.memory.status = 'working'
            if (creep.upgradeController(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
            } else {
                // to save a tick to do another work
                if (creep.carry.energy == 0) {
                    // no energy, can't upgrade, work done
                    creep.memory.status = 'done'
                    return
                }
            }
        }
    }
}

var Build = {
    getSiteToBuild: (creep) => {
        var site_list = creep.room.find(FIND_CONSTRUCTION_SITES)
        if (site_list.length) {
            for (var i in site_list) {
                if (Route.isPositionSafe(creep.room, site_list[i].pos.x, site_list[i].pos.y)) {
                    return site_list[i]
                }
            }
        }
        else
            return null
    },
    run: (creep) => {
        if (creep.carry.energy == 0) {
            // no energy, can't fill, work done
            creep.memory.status = 'done'
            creep.memory.target_id = null
            return
        }
        
        if (!creep.memory.target_id) {
            var target = Build.getSiteToBuild(creep)
            if (target)
                creep.memory["target_id"] = target.id
        } else {
            var target = Game.getObjectById(creep.memory.target_id)
        }
        // if target not exits or progress is done
        if (!target || target.progress >= target.progressTotal) {
            // nothing to fill, work has done
            creep.memory.status = 'done'
            creep.memory.target_id = null
            return
        } else {
            creep.memory.status = 'working'
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
            } else {
                // no energy, done. target disappear, done.
                if (creep.carry.energy == 0 || !target || target.progress >= target.progressTotal) {
                    // no energy, can't upgrade, work done
                    creep.memory.status = 'done'
                    creep.memory.target_id = null
                    return
                }
            }
        }
    }
}

var Maintain = {
    TICK_THRESHOLD_DOWN: 7000,
    run: (creep) => {
        var controller = creep.room.controller
        if (controller.ticksToDowngrade < Maintain.TICK_THRESHOLD) {
            if (!controller.room.memory.maintainer || controller.room.memory.maintainer == creep.id) {
                controller.room.memory['maintainer'] = creep.id
                Update.run(creep)
            }
        }

        if (controller.ticksToDowngrade >= Maintain.TICK_THRESHOLD) {
            controller.room.memory.maintainer = null
            creep.memory.status = 'done'
        }
    }
}

class Repair {
    constructor(repair_to_hits, hits_trigger_repair = 1) {
        this.repair_to_hits = repair_to_hits
        this.hits_trigger_repair = hits_trigger_repair
    }

    findStructureToRepair(creep) {
        var room = creep.room
        var structure_list = room.find(FIND_MY_STRUCTURES, {filter: (s) => {
            return s.hits < s.hitsMax && s.hits < hits_trigger_repair
        }})
        if (structure_list.length) {
            return structure_list[0]
        } else {
            return null
        }
    }

    run(creep) {
        if (creep.carry.energy == 0) {
            // no energy, can't fill, work done
            creep.memory.status = 'done'
            creep.memory.target_id = null
            return
        }
        
        if (!creep.memory.target_id) {
            var target = this.findStructureToRepair(creep)
            if (target)
                creep.memory["target_id"] = target.id
        } else {
            var target = Game.getObjectById(creep.memory.target_id)
        }


        // if there isn't a target, or target is in max hits, or target has been repaired to the desired hits
        if (!target || target.hits >= target.hitsMax || target.hits >= this.repair_to_hits) {
            // nothing to fill, work has done
            creep.memory.status = 'done'
            creep.memory.target_id = null
            return
        } else {
            creep.memory.status = 'working'
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target)
            } else {
                // no energy, done. target disappear, done.
                if (creep.carry.energy == 0 || !target || target.hits >= target.hitsMax || target.hits >= this.repair_to_hits) {
                    // no energy, can't upgrade, work done
                    creep.memory.status = 'done'
                    creep.memory.target_id = null
                    return
                }
            }
        }
    }
}


var priority_list = [
    Harvest,
    Maintain,
    Fill,
    new Repair(1000,200),
    Build,
    new Repair(5000,3000),
    Update,
    new Repair(300 * 1000 * 1000),
]

var WorkerAI = {
    run : function(creep) {
        // if not worker, do not use this AI
        if (creep.memory.role != 'worker') {
            return;
        }
        // if previous work has not done, continue
        if (creep.memory.status != 'done') {
            priority_list[creep.memory.working].run(creep)
        }
        // if done, find a new work
        if (creep.memory.status == 'done')
        {
            // try assign a work according to the priority
            for (var no in priority_list) {
                var work = priority_list[no]
                creep.memory['working'] = no
                work.run(creep)
                // if work has not done, so it has got a new work, otherwise try the next
                if (creep.memory.status != 'done') {
                    break
                }
            }
        }
    },
}

module.exports = WorkerAI