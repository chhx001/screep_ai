const Logger = require("./Logger");

class BuildPlannerLevel0 {
    constructor(room_name) {
        this.room_name = room_name
        this.room = Game.rooms[room_name]
        if (this.room.memory.user == undefined) {
            this.room.memory.user = {}
        }
    }

    plan() {

    }
}

class BuildPlannerLevel1 extends BuildPlannerLevel0 {
    constructor(room_name) {
        super(room_name)
    }

    plan_roads() {
        if (this.room.memory.user.next_road_check == undefined)
            this.room.memory.user.next_road_check = 0
        if (this.room.memory.user.next_road_check > Game.time)
            return;     /* not time to check */
        /* source to spawn */
        var spawn_list = this.room.find(FIND_MY_STRUCTURES, {filter: (s) => {return (s.structureType == STRUCTURE_SPAWN)}})
        var source_list = this.room.find(FIND_SOURCES)
        for (var i = 0; i < spawn_list.length; i ++) {
            for (var j = 0; j < source_list.length; j ++) {
                var path = this.room.findPath(spawn_list[i].pos, source_list[j].pos, {swampCost:1})
                for (var k = 0; k < path.length; k ++) {
                    this.room.createConstructionSite(path[k].x, path[k].y, STRUCTURE_ROAD);
                }
                
            }
        }
        /* surround source */
        /* source to controller */

        this.room.memory.user.next_road_check = Game.time + 1000
    }

    plan() {
        this.plan_roads();
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

module.exports = { BuildPlanner }