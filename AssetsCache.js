var logger = require("Logger.js");
var events = require("Events.js")
var eq = require("EventQueue.js")

module.exports = {
    MODULE_NAME:String = "AssetsCache",
    VERSION:Number = 1,

    need_init_memory() {
        if (Memory.user.assets == undefined || Memory.user.assets.version == undefined || Memory.user.assets.version < this.VERSION)
            return true;
        return false;
    },

    init_memory() {
        if (this.need_init_memory()) {
            Memory.user.assets = {}
            Memory.user.assets.version = 0;
            this.clear_assets();
            Memory.user.assets.next_scan_tick = Game.time;

            Memory.user.assets.version = VERSION;
        }
    },

    clear_assets() {
        Memory.user.assets.creeps = { name_list:Array=[] };
        Memory.user.assets.rooms = [];
    },

    scan() {
        if (Game.time < Memory.user.assets.next_scan_tick)
            return 0;
        this.clear_assets();

        var assets = Memory.user.assets

        // rooms & spawns
        for (var s_name in Game.spawns) {
            var room = Game.spawns[s_name].room;
            // resources
            var i = assets.rooms.list.length
            assets.rooms[i] = {
                name:String = room.name,
                spawn_name:String = spawn_name,
                sources:Array = []
            }
            room.find(FIND_SOURCES).forEach(function(source) {
                assets.rooms.list[i]
            });
        }
    }
    
}