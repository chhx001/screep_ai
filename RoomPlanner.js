const Logger = require("./Logger")
const PrioritizedQueue = require("./PrioritizedQueue");
const { CpuManager } = require("./CpuManager");

const OP_DONE = 0;
const OP_AGAIN_NEXT = 1;

const ROOM_WIDTH = 50;
const ROOM_HEIGHT = 50;

const RoomPlannerOption = {
    DEFAULT_SCAN_INTERVAL : 500,
    max_queue_priority: 1,
    queue_size_list: [100],
    BUILD_PLAN_DEFAULT_MAX_CYCLE: 10,
}

const PlannerOp = {
    PLANNER_OPCODE_ROAD_PATH        : 0x2000,
    PLANNER_OPCODE_FLUSH_PLAN       : 0x2001,

    generate(opcode, params) {
        var ret = {}
        for (var p in params) {
            ret[p] = params[p]
        }
        ret.code = opcode
        return ret;
    }
}

class BuildPlannerLevel0 {
    constructor(room_name) {
        this.MODULE_NAME = room_name
        this.room_name = room_name
        this.room = this.obj = Game.rooms[room_name]
        if (this.room.memory.user == undefined) {
            this.room.memory.user = {}
        }
        if (this.room.memory.user.maintain == undefined) {
            this.room.memory.user.maintain = {last_plan_level:0, site_num: 0}
        }

        if (this.obj.memory.user.pq == undefined || this.obj.memory.user.pq.module_name != this.MODULE_NAME) {
            this.obj.memory.user.pq = {}
            this.pq = new PrioritizedQueue(this.obj.memory.user.pq)
            
            this.pq.init(RoomPlannerOption.max_queue_priority, RoomPlannerOption.queue_size_list, this.MODULE_NAME)
            this.pq.save()
        } else {
            this.pq = new PrioritizedQueue(this.obj.memory.user.pq)
            this.pq.load()
        }

        this.op_task_map = []
        this.op_task_map.push({code: PlannerOp.PLANNER_OPCODE_FLUSH_PLAN, cb: this.flush_construction_site})

        if (this.room.memory.user.site_cache == undefined) {
            this.room.memory.user.site_cache = {}
        }
    }

    flush_construction_site(planner, op) {
        var x, y;
        var r = undefined
        var site_cache = planner.room.memory.user.site_cache
        if (Object.keys(site_cache).length > 0) {
            for (x in site_cache) {
                for (y in site_cache[x]) {
                    var r = planner.room.createConstructionSite(Number(x), Number(y), site_cache[x][y])
                    if (r == ERR_FULL) {/* too many sites, return OK to stop looping, but keep the cache */
                        return OP_DONE
                    } else if (r != OK) {
                        Logger.warn(planner, "construction site ("+x+","+y+","+site_cache[x][y]+") report special error " + r);
                    } else {
                        planner.room.memory.user.maintain.site_num ++;
                        if (planner.room.memory.user.maintain[site_cache[x][y]].count != undefined) {
                            planner.room.memory.user.maintain[site_cache[x][y]].count ++
                        }
                    }
                    break;
                }
                if (r != undefined) /* jump out, we just want to book one construct site per tick */
                    break;
            }
            /* remove the settled site */
            delete site_cache[x][y]
            if (Object.keys(site_cache[x]).length == 0)
                delete site_cache[x]
            if (Object.keys(site_cache).length == 0) {
                planner.pq.pop()
                return OP_DONE
            } else {
                return OP_AGAIN_NEXT
            }
        } else {
            planner.pq.pop()
            return OP_DONE
        }
    }
    
    run(max_cycle=RoomPlannerOption.BUILD_PLAN_DEFAULT_MAX_CYCLE) {
        var op = this.pq.top()
        var ret;
        
        while (op && max_cycle -- && CpuManager.agree()) {
            for (var i = 0; i < this.op_task_map.length; i ++) {
                if (op.code == this.op_task_map[i].code) {
                    ret = this.op_task_map[i].cb(this, op)
                    break;
                }
            }
            if (ret == OP_DONE) {
                break;
            }

            op = this.pq.top()
        }
    }

    schedule() {

    }
}

class BuildPlannerLevel1 extends BuildPlannerLevel0 {
    constructor(room_name) {
        super(room_name)
        /* road task */
        this.op_task_map.push({code: PlannerOp.PLANNER_OPCODE_ROAD_PATH, cb: this.do_road_plan_task})
    }

    is_new_level() {
        if (this.room.memory.user.maintain.last_plan_level < this.room.controller.level) {
            this.room.memory.user.maintain.last_plan_level = this.room.controller.level
            for (var s_type in this.room.memory.user.maintain) {
                if (this.room.memory.user.maintain[s_type].next_tick != undefined)
                    this.room.memory.user.maintain[s_type].next_tick = 0
            }
        }
    }

    check_for_replan(structure_type, find_structure, find_construction_site, memory_entry, minimum_count = 0) {
        /* only plan when pq clear, no construction site on the room, no cached sites , to avoid conflict */
        if (this.pq.top()) return;
        if ((Object.keys(this.room.memory.user.site_cache).length > 0)) {
            /* if there is cached sites, flush first */
            this.pq.push(PlannerOp.generate(PlannerOp.PLANNER_OPCODE_FLUSH_PLAN, {}), 0)
            return;
        }
        
        if (this.room.memory.user.maintain.site_num > 0) return;
        
        var count = 0
        if (memory_entry.next_tick <= Game.time) {
            
            /* rescan to see if need replan */
            Memory.user.cache = structure_type
            count += this.room.find(find_structure, {filter: (s) => {return (s.structureType == Memory.user.cache)}}).length
            count += this.room.find(find_construction_site, {filter: (s) => {return (s.structureType == Memory.user.cache)}}).length
            if (count < memory_entry.count || count < minimum_count) {
                /* actual road is lesser than road in this room */
                memory_entry.next_tick = Game.time + RoomPlannerOption.DEFAULT_SCAN_INTERVAL;
                return true
            }
        }

        return false
    }

    cache_site(x, y, structure_type) {
        /* if already built, skip*/
        var site_cache = this.room.memory.user.site_cache

        if (site_cache[x] == undefined) {
            site_cache[x] = {}
        }
        site_cache[x][y] = structure_type
    }

    cache_road_site(x, y, param = {}) {
        /* if already built, skip*/
        var pos_at = this.room.getPositionAt(x, y).look()
        for (var i = 0; i < pos_at.length; i ++) {
            if (pos_at[i].type == "structure" && pos_at[i].structure.structureType == STRUCTURE_ROAD)
                return
            if (pos_at[i].type == "constructionSite" && pos_at[i].constructionSite.structureType == STRUCTURE_ROAD)
                return
        }

        var site_cache = this.room.memory.user.site_cache

        if (site_cache[x] == undefined) {
            site_cache[x] = {}
        }
        site_cache[x][y] = STRUCTURE_ROAD
    }

    submit_road_plan_task(from_x, from_y, to_x, to_y) {
        this.pq.push(PlannerOp.generate(PlannerOp.PLANNER_OPCODE_ROAD_PATH, {
            from: {x: from_x, y:from_y, room_name:this.room_name},
            to:{x: to_x, y: to_y, room_name:this.room_name}}), 0)
    }

    do_road_plan_task(planner, op) {
        /* overwrite road site cost as built road */
        var get_cost_matrix = function(room_name) {
            var room = Game.rooms[room_name];
            var road_sites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}})
            var roads = room.find(FIND_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}})
            var cost_matrix = new PathFinder.CostMatrix;

            // if creeps are on roads, then it is road
            room.find(FIND_CREEPS).forEach(function(creep) {
                var pos_data = room.lookAt(creep.pos)
                for (var i = 0; i < pos_data.length; i ++) {
                    if (pos_data[i].type == 'structure' && pos_data[i].structure.structureType == STRUCTURE_ROAD) {
                        cost_matrix.set(creep.pos.x, creep.pos.y, 1);
                    } else if (pos_data[i].type == 'terrain' && pos_data[i].terrain == "plain") {
                        cost_matrix.set(creep.pos.x, creep.pos.y, 2);
                    } else if (pos_data[i].type == 'terrain' && pos_data[i].terrain == "swamp") {
                        cost_matrix.set(creep.pos.x, creep.pos.y, 10);
                    }
                }
            });

            // ignore tombstones
            room.find(FIND_TOMBSTONES).forEach(function(stone) {
                cost_matrix.set(stone.pos.x, stone.pos.y, 1);
            });
            
            for (var k = 0; k < road_sites.length; k ++) {
                cost_matrix.set(road_sites[k].pos.x, road_sites[k].pos.y, 1)
            }

            for (var k = 0; k < roads.length; k ++) {
                cost_matrix.set(roads[k].pos.x, roads[k].pos.y, 1)
            }
            return cost_matrix
        }
        
        var from_pos = new RoomPosition(op.from.x, op.from.y, op.from.room_name)
        var to_pos = new RoomPosition(op.to.x, op.to.y, op.to.room_name)

        var find_res = PathFinder.search(from_pos, {pos:to_pos, range:1}, {plainCost: 2,
            swampCost: 10, roomCallback:get_cost_matrix})
        var path = find_res.path;
        for (var k = 0; k < path.length; k ++) {
            planner.cache_road_site(path[k].x, path[k].y)
        }
        planner.pq.pop()
        return OP_DONE

    }

    schedule_plan_roads() {
        if (this.room.memory.user.maintain[STRUCTURE_ROAD] == undefined) {
            this.room.memory.user.maintain[STRUCTURE_ROAD] = {count:0, next_tick:0}
        }
        if (!this.check_for_replan(STRUCTURE_ROAD, FIND_STRUCTURES, FIND_MY_CONSTRUCTION_SITES, this.room.memory.user.maintain[STRUCTURE_ROAD])) {
            return
        }

        /* this one only used here */
        Logger.info(this, "replan roads")
        /* use PathFinder */
        
        /* source to spawn */
        var spawn_list = this.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_SPAWN)}})
        var sources = this.room.memory.user.resources.sources.dict
        for (var source_id in sources) {
            for (var i = 0; i < spawn_list.length; i ++) {
                var source = Game.getObjectById(source_id)
                /* road sourround sources, in range 2 */
                var mining_park = RoomPlanner.look_for_stance_in_rect(this.room.name, source.pos.x, source.pos.y, 2);
                for (var k = 0; k < mining_park.length; k ++) {
                    var park = mining_park[k];
                    this.cache_road_site(park.x, park.y);
                }

                this.submit_road_plan_task(spawn_list[i].pos.x, spawn_list[i].pos.y, source.pos.x, source.pos.y)
                
            }

            /* source to controller */
            var controller = this.room.controller;
            this.submit_road_plan_task(controller.pos.x, controller.pos.y, source.pos.x, source.pos.y)
        }
    }

    schedule_plan_container() {
        if (this.room.memory.user.maintain[STRUCTURE_CONTAINER] == undefined) {
            this.room.memory.user.maintain[STRUCTURE_CONTAINER] = {count:0, next_tick:0}
        }
        
        var source_num = Object.keys(this.room.memory.user.resources.sources.dict).length
        
        if (!this.check_for_replan(STRUCTURE_CONTAINER, FIND_MY_STRUCTURES, FIND_MY_CONSTRUCTION_SITES, this.room.memory.user.maintain[STRUCTURE_CONTAINER], source_num)) {
            /* doesn't need replan */
            return
        }
        

        /* if every resource has assigned container and it exists, skip */
        var source_dict = this.room.memory.user.resources.sources.dict
        for (var src_id in source_dict) {
            if (source_dict[src_id].container_id == undefined || (!Game.getObjectById(source_dict[src_id].container_id))) {
                /* plan for this source */
                var source = Game.getObjectById(src_id)
                /* if source already has an container in range 2, skip */
                if (source.pos.findInRange(FIND_MY_STRUCTURES, {filter:(s)=>{return s.structureType == STRUCTURE_CONTAINER}}).length > 0)
                    continue;

                /* find a place, which distance_to_source=2, terrain is plain or swamp, no source/mineral and structure(except road) in distance1 */
                var terrain = new Room.Terrain(this.room.name)
                var best_position = null
                var best_stance_weight = Infinity
                
                for (var y = source.pos.y - 2; y <= source.pos.y + 2; y ++) {
                    for (var x = source.pos.x - 2; x <= source.pos.x + 2; x ++) {
                        var room_pos = this.room.getPositionAt(x, y)
                        if (terrain.get(x,y) != TERRAIN_MASK_WALL && room_pos.getRangeTo(source) == 2) {
                            /* see if any source/mineral or structure besides */
                            /* find structures, road is not my_structures so it is already filtered */
                            if (room_pos.findInRange(FIND_MY_STRUCTURES, 1).length > 0)
                                continue;   /* skip */
                            /* construction site except road */
                            if (room_pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1, {filter:(s)=>{return (s.structureType != STRUCTURE_ROAD)}}).length > 0)
                                continue;
                            /* source */
                            if (room_pos.findInRange(FIND_SOURCES, 1).length > 0)
                                continue;
                            /* minerals */
                            if (room_pos.findInRange(FIND_MINERALS, 1).length > 0)
                                continue;

                            /* corner case check, don't put at dead end, the container to controller have a path which won't step into the source stance*/
                            Memory.user.cache = src_id  /* cache src_id */
                            var res = PathFinder.search(room_pos, {pos:this.room.controller.pos, range:1}, {
                                /* maxCost < 0xff, so it can't walk thorugh stances, maxOps is low, we don't need to find so far */
                                plainCost: 1, swampCost:1, maxCost:0xfe, maxOps:100,
                                roomCallback:(room_name) => {
                                    var room = Game.rooms[room_name]
                                    var costs = new PathFinder.CostMatrix;
                                    var source_data = room.memory.user.resources.sources.dict
                                    var src_id = Memory.user.cache
                                    for (var i = 0; i < source_data[src_id].stances.length; i ++) {
                                        /* avoid stances */
                                        costs.set(source_data[src_id].stances[i].x, source_data[src_id].stances[i].y, 0xff)
                                    }
                                }
                            })
                            /* can't find such a path, and the cloest path is quite short, then we don't use this position*/
                            if (res.incomplete && res.path.length <= 5)
                                continue;

                            /* get the total weight to the stances, finally we will pick on position with */
                            var weight = 0;
                            for (var i = 0; i < source_dict[src_id].stances.length; i ++)
                                weight += room_pos.getRangeTo(source_dict[src_id].stances[i].x, source_dict[src_id].stances[i].y)

                            if (best_stance_weight > weight) {
                                best_stance_weight = weight
                                best_position = room_pos
                            }
                        }
                    }
                }

                if (best_position) {
                    /* OK, this is the place, if there is constuction site already, remove it */
                    // best_position.lookFor(LOOK_CONSTRUCTION_SITES).forEach((site) => {
                    //     site.remove();
                    // })
                    /* cache the site */
                    this.cache_site(best_position.x, best_position.y, STRUCTURE_CONTAINER)
                }
            }
        }
        
    }

    schedule() {
        this.is_new_level();
        if (CpuManager.agree())
            this.schedule_plan_roads();
        if (CpuManager.agree())
            this.schedule_plan_container();
    }

}

class BuildPlannerLevel2 extends BuildPlannerLevel1 {
    constructor(room_name) {
        super(room_name)
    }

    validate_extension_park(x, y) {
        /* park can't exceed room */
        if (y -  2 < 0 || x - 2 < 0 || y + 2 >= ROOM_HEIGHT || x + 2 >= ROOM_WIDTH)
            return false;
        area = this.room.lookAtArea(y - 2, x - 2, y + 2, x + 2);
        /* see center, no structure and walkable */
        var empty_at = (area_at) => {
            for (var i = 0; i < area_at.length; i ++) {
                if (area_at[i].type == "terrain" && area_at[i].terrain == "wall")
                    return false;
                if (area_at[i].type == "structure")
                    return false
                return true
            }
        }
        if (!(empty_at(area[y][x]) &&
        empty_at(area[y-1][x]) &&
        empty_at(area[y][x-1]) &&
        empty_at(area[y+1][x]) &&
        empty_at(area[y][x+1])))
            return false;

        /* surround, can be path or container, can't be rampart, needs to be walable */
        var walkable_at = (area_at) => {
            for (var i = 0; i < area_at.length; i ++) {
                if (area_at[i].type == "terrain" && area_at[i].terrain == "wall")
                    return false;
                if (area_at[i].type == "structure" && (area_at.structure.structureType != STRUCTURE_ROAD && area_at.structure.structureType != STRUCTURE_CONTAINER))
                    return false
                return true
            }
        }

        if (!(walkable_at(area[y-2][x]) &&
        walkable_at(area[y-1][x-1]) &&
        walkable_at(area[y][x-2]) &&
        walkable_at(area[y+1][x-1]) &&
        walkable_at(area[y+2][x]) &&
        walkable_at(area[y+1][x+1]) &&
        walkable_at(area[y][x+2]) &&
        walkable_at(area[y-1][x+1])))
            return false;
        
        return true
    }

    schedule_plan_extensions() {
        if (this.room.memory.user.maintain[STRUCTURE_EXTENSION] == undefined) {
            this.room.memory.user.maintain[STRUCTURE_EXTENSION] = {count:0, next_tick:0}
        }
        /* for extension, the desired num is always the controller's max num */
        //this.room.memory.user.maintain[STRUCTURE_EXTENSION].count = Number(CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.room.controller.level])
        if (!this.check_for_replan(STRUCTURE_EXTENSION, FIND_MY_STRUCTURES, FIND_MY_CONSTRUCTION_SITES, this.room.memory.user.maintain[STRUCTURE_EXTENSION])) {
            /* doesn't need replan */
            return
        }

        /* Extension Park Design */
        /* R = Road E = Extension X=Any
         *     R
         *   R E R
         * R E E E R
         *   R E R
         *     R
         * /
         /* We need to find the centry pos first, then plan the others.
          * Each tick just plan for 1 entire park, to avoid conflicts
          * the extension max count is depends on the controller, so when checking, compare it with the controller's max value */
        /* search from spawn */
        var range = 2;  
        var spawn_list = this.room.find(FIND_STRUCTURES, {filter:(s) => {return s.structureType == STRUCTURE_SPAWN}})
        var x,y;
        var found = false
        if (spawn_list.length > 0) {
            /* the closest start range is 2 */
            for (var range = 2;range < ROOM_HEIGHT && !found; range ++) {
                for (var i = 0;i < spawn_list.length && !found; i ++) {
                    var left = spawn_list[i].pos.x - range
                    var up = spawn_list[i].pos.y - range
                    var right = spawn_list[i].pos.x + range
                    var bottom = spawn_list[i].pos.y + range
                    if (left < 0 && up < 0 && bottom >= ROOM_HEIGHT && right >= ROOM_WIDTH) continue;   /* if the boarder is all out of room, continue */
                    for (y = up, x = left; x <= right && !found; x ++) found = this.validate_extension_park(x, y);
                    for (y = up, x = left; y <= bottom && !found; y ++) found = this.validate_extension_park(x, y);
                    for (y = bottom, x = right; x >= left && !found; x --) found = this.validate_extension_park(x, y);
                    for (y = bottom, x = right; y >= up && !found; y ++) found = this.validate_extension_park(x, y);
                }
            }
        }

        if (found) {
            this.cache_road_site(x-2, y);
            this.cache_road_site(x-1, y-1);
            this.cache_road_site(x, y-2);
            this.cache_road_site(x+1, y-1);
            this.cache_road_site(x+2, y);
            this.cache_road_site(x+1, y+1);
            this.cache_road_site(x, y+2);
            this.cache_road_site(x-1, y+1);

            this.cache_site(x, y, STRUCTURE_EXTENSION);
            this.cache_site(x+1, y, STRUCTURE_EXTENSION);
            this.cache_site(x, y+1, STRUCTURE_EXTENSION);
            this.cache_site(x-1, y, STRUCTURE_EXTENSION);
            this.cache_site(x, y-1, STRUCTURE_EXTENSION);
        }
    }

    schedule() {
        this.is_new_level();
        if (CpuManager.agree())
            this.schedule_plan_roads();
        if (CpuManager.agree())
            this.schedule_plan_container();
        if (CpuManager.agree())
            this.schedule_plan_extensions();
    }

}

class BuildPlannerLevel3 extends BuildPlannerLevel2 {
    constructor(room_name) {
        super(room_name)
    }
}

class BuildPlannerLevel4 extends BuildPlannerLevel3 {
    constructor(room_name) {
        super(room_name)
    }
}

class BuildPlannerLevel5 extends BuildPlannerLevel4 {
    constructor(room_name) {
        super(room_name)
    }
}

class BuildPlannerLevel6 extends BuildPlannerLevel5 {
    constructor(room_name) {
        super(room_name)
    }
}

class BuildPlannerLevel7 extends BuildPlannerLevel6 {
    constructor(room_name) {
        super(room_name)
    }
}

class BuildPlannerLevel8 extends BuildPlannerLevel7 {
    constructor(room_name) {
        super(room_name)
    }
}


const BuildPlanner = {
    planner_list : [
        BuildPlannerLevel0,
        BuildPlannerLevel1,
        BuildPlannerLevel2,
        BuildPlannerLevel3,
        BuildPlannerLevel4,
        BuildPlannerLevel5,
        BuildPlannerLevel6,
        BuildPlannerLevel7,
        BuildPlannerLevel8,
    ],
    get_planner(room_name) {
        var room = Game.rooms[room_name]
        var level = room.controller.level
        var planner = new this.planner_list[level](room_name)
        return planner
    }
}



class RoomPlanner {
    
    constructor(name) {
        this.MODULE_NAME = name
        this.room_name = name
        this.obj = this.room = Game.rooms[name]
        if (this.obj.memory.user == undefined) {
            this.obj.memory.user = {}
        }

        this.planner = BuildPlanner.get_planner(name)
    }

    /* look for standable pos in a rect with a center position */
    static look_for_stance_in_rect(room_name, center_x, center_y, range) {
        var obj = Game.rooms[room_name]
        var ret = []
        var area = obj.lookForAtArea(LOOK_TERRAIN, center_y - range, center_x - range, center_y + range, center_x + range, true);
        for (var i = 0; i < area.length; i ++) {
            if ((area[i].terrain == "plain" || area[i].terrain == "swamp")) {
                ret.push({x:area[i].x, y:area[i].y})
            }
        }
        return ret;
    }

    scan_resouces() {
        /* resources normally needs only needs to be scanned once */
        if (this.obj.memory.user.resources == undefined) {
            this.obj.memory.user.resources = {}
        }
        var list;
        /* sources */
        if (this.obj.memory.user.resources.sources == undefined) {
            this.obj.memory.user.resources.sources = {dict:{}, harvest_cnt:0}
            list = this.obj.find(FIND_SOURCES)
            for (var i = 0; i < list.length; i ++) {
                var source = list[i]
                /* look for terrain plan/swamp */
                var stance = RoomPlanner.look_for_stance_in_rect(this.obj.name, source.pos.x, source.pos.y, 1);
                for (var j = 0;j < stance.length; j ++) {
                    stance[j].target_id = source.id
                }
                this.obj.memory.user.resources.sources.dict[source.id] = {
                    stances: stance
                }
            }
        }
        /* TODO: other resources */
    }

    scan_structure_site() {
        /* if there is sites, or this is tick to scan, then scan */
        if (this.room.memory.user.maintain.site_num == 0) return
        this.room.memory.user.maintain.site_num = this.room.find(FIND_MY_CONSTRUCTION_SITES).length;
        
    }

    scan_extension_park() {
        /* find the center of each extension park */
        /* the full extension park is always 
         *     E
         *   E E E
         *     E
         */
        /* so we find the first one, then see if it is one of the above position,
         * incase that any of the extionsions are destroied, a plain or swamp is also
         * accepted, if we found one, always record the CENTER pos */

        var extension_list = this.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return s.structureType == STRUCTURE_EXTENSION}})
        /* if extension is full, then don't need to scan anymore */
        if (this.room.memory.user.maintain[STRUCTURE_EXTENSION].count == CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.room.controller.level]) return;

        for (var i = 0; i < extension_list.length; i ++) {

        }

    }

    scan_for_maintainance() {
        if (this.room.memory.user.maintain.next_tick > Game.time) return
        this.scan_structure_site();
        this.scan_extension_park();
        this.room.memory.user.maintain.next_tick = Game.time + RoomPlannerOption.DEFAULT_SCAN_INTERVAL;
    }

    scan() {
        this.scan_resouces();
        this.scan_for_maintainance();
    }

    schedule_build() {
        this.planner.schedule()
    }

    run_build() {

        this.planner.run();
    }


}

module.exports = {RoomPlanner}