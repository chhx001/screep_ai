const Logger = require("./Logger")

const RoomScannerOption = {
    DEFAULT_SCAN_INTERVAL : 1000,
}

class RoomSummary {
    
    constructor(name) {
        this.MODULE_NAME = name
        this.version = RoomScannerOption.VERSION
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
        var area = this.obj.lookAtArea(center_y.y - range, center_x - range, center_y + range, center_x + range);
        for (var y in area) {
            for (var x in area[y]) {
                for (var j = 0; j < area[y][x]; j++) {
                    if (area[y][x][j].type == "terrain") {
                        if (area[y][x][j].terrain == "swamp" || area[y][x][j].terrain == "plain") {
                            ret.push({x:x, y:y, terrian:area[y][x][j].terrain})
                            break;
                        }
                    }
                }
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
            this.obj.memory.user.resources.sources = {}
            list = this.obj.find(FIND_SOURCES)
            for (var i = 0; i < list.length; i ++) {
                var source = list[i]
                /* look for terrian plan/swamp */
                var stance = RoomSummary.look_for_stance_in_rect(this.obj.name, source.pos.x, source.pos.y, 1);
                
                this.obj.memory.user.resources.sources[source.id] = {
                    pos: {
                        x: source.pos.x,
                        y: source.pos.y,
                    },
                    stance: stance
                }
            }
        }
        /* TODO: other resources */
    }

    scan() {
        this.scan_resouces();
    }


}

module.exports = {RoomSummary}