const Logger = require("./Logger")

const RoomPlannerOption = {
    DEFAULT_SCAN_INTERVAL : 500,
}

class BuildPlannerLevel0 {
    constructor(room_name) {
        this.MODULE_NAME = room_name
        this.room_name = room_name
        this.room = Game.rooms[room_name]
        if (this.room.memory.user == undefined) {
            this.room.memory.user = {}
        }
        if (this.room.memory.user.maintain == undefined) {
            this.room.memory.user.maintain = {last_plan_level:0}
        }
        
        this.force_scan = false
        this.roads_count = 0
    }

    construct_road(x, y, param = {}) {
        /* no matter how, we count for this road */
        this.roads_count ++
        if (param.skip_plain == true && this.room.getTerrain().get(x, y)) {
           return
        }
        /* if already built */
        var pos_at = this.room.getPositionAt(x, y).look()
        for (var i = 0; i < pos_at.length; i ++) {
            if (pos_at[i].type == "structure" && pos_at[i].structure.structureType == STRUCTURE_ROAD)
                return
            if (pos_at[i].type == "constructionSite" && pos_at[i].constructionSite.structureType == STRUCTURE_ROAD)
                return
        }
        this.room.createConstructionSite(x, y, STRUCTURE_ROAD);
    }

    plan() {

    }
}

class BuildPlannerLevel1 extends BuildPlannerLevel0 {
    constructor(room_name) {
        super(room_name)
    }

    is_new_level() {
        if (this.room.memory.user.maintain.last_plan_level < this.room.controller.level) {
            this.force_scan = true
        }
    }

    check_for_roads_replan() {
        
        if (this.room.memory.user.maintain.roads == undefined || this.force_scan) {
            this.roads_count = 0;
            this.room.memory.user.maintain.roads = {count:0, next_tick:0}
            return true
        }
        var roads_count = 0
        /* Scheduled rescan time */
        if (this.room.memory.user.maintain.roads.next_tick <= Game.time) {
            /* rescan to see if need replan */
            
            roads_count += this.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}}).length
            roads_count += this.room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}}).length
            if (this.roads_count < this.room.memory.user.maintain.roads) {
                /* actual road is lesser than road in this room */
                return true
            }
        }

        return false
    }

    plan_roads(construction_param) {
        if (!this.check_for_roads_replan()) {
            /* doesn't need replan */
            return
        }

        /* this one only used here */
        var get_cost_matrix = function(room, cost_matrix) {
            //var room = Game.rooms[room_name];
            //console.log(room_name)
            var road_sites = room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (s) => {return (s.structureType == STRUCTURE_ROAD)}})
            for (var k = 0; k < road_sites.length; k ++) {
                cost_matrix.set(road_sites[k].pos.x, road_sites[k].pos.y, 0.5)
            }
            return cost_matrix
        }

        Logger.info(this, "replan roads")
        /* use PathFinder */
        PathFinder.use(true);
        /* source to spawn */
        var spawn_list = this.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_SPAWN)}})
        var sources = this.room.memory.user.resources.sources.dict
        for (var source_id in sources) {
            for (var i = 0; i < spawn_list.length; i ++) {
                var source = Game.getObjectById(source_id)
                /* costmatrix, make road construction site as road */
                var path = this.room.findPath(spawn_list[i].pos, source.pos, {ignoreCreeps:1, costMatrix:get_cost_matrix, range:1})
                for (var k = 0; k < path.length; k ++) {
                    this.construct_road(path[k].x, path[k].y, construction_param);
                }
                /* source stance as path */
                for (var k = 0; k < sources[source_id].stances.length; k ++) {
                    var stance = sources[source_id].stances[k];
                    this.construct_road(stance.x, stance.y, construction_param);
                } 
                
            }

            /* source to controller */
            var controller = this.room.controller;
            var path = this.room.findPath(controller.pos, source.pos, {ignoreCreeps:1, costMatrix:get_cost_matrix,range:1})
            for (var k = 0; k < path.length; k ++) {
                this.construct_road(path[k].x, path[k].y, construction_param);
            }
        }
        this.room.memory.user.maintain.roads.count = this.roads_count;
        this.room.memory.user.maintain.roads.next_tick = Game.time + RoomPlannerOption.DEFAULT_SCAN_INTERVAL
    }

    plan() {
        this.is_new_level();
        /* TODO: check CPU here */
        this.plan_roads();
        this.room.memory.user.maintain.last_plan_level = this.room.controller.level
    }
}

class BuildPlannerLevel2 extends BuildPlannerLevel1 {
    constructor(room_name) {
        super(room_name)
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
    plan_for(room_name) {
        var room = Game.rooms[room_name]
        var level = room.controller.level
        var planner = new this.planner_list[level](room_name)
        planner.plan();
    }

}

class RoomPlanner {
    
    constructor(name) {
        this.MODULE_NAME = name
        this.room_name = name
        this.obj = Game.rooms[name]
        if (this.obj.memory.user == undefined) {
            this.obj.memory.user = {}
        }
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
                Logger.debug(this, "stance=" + stance.length)
                this.obj.memory.user.resources.sources.dict[source.id] = {
                    stances: stance
                }
            }
        }
        /* TODO: other resources */
    }

    scan() {
        this.scan_resouces();
    }

    plan() {
        BuildPlanner.plan_for(this.room_name)
    }


}

module.exports = {RoomPlanner}