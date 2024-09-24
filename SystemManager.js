const { CpuManager } = require("./CpuManager");
const { CreepClass } = require("./CreepMachine");
const Logger = require("./Logger");
const { RoomPlanner } = require("./RoomPlanner");
const { SpawnClass } = require("./SpawnMachine");


const GCWorker = {
    init() {
        /* Setup static val */
        GCWorker.MODULE_NAME = "GCWorker"

        /* Setup memory */
        if (Memory.user.gc == undefined) {
            Memory.user.gc = {}
            Memory.user.gc.next_gc_time = 0;
        }
    },

    report_next_gc_time(time) {
        /* static GC timging */
        if (Memory.user.gc.next_gc_time < time)
            Memory.user.gc.next_gc_time = time;
    },

    is_gc_time() {
        return (Game.time > Memory.user.gc.next_gc_time)
    },

    run() {
        if (!this.is_gc_time())
            return
        Logger.debug(this, "GC start")
        /* Creeps */
        for (var name in Memory.creeps) {
            if (!Game.creeps[name])
                delete Memory.creeps[name]
        }
        /* delete debugging temp */
        delete Memory.user.temp

        this.report_next_gc_time(Game.time + 500)
    },
}

const Scheduler = {
    init() {

    },

    scan_spawns() {
        var spawn_list = []
        for (var name in Game.spawns) {
            spawn = new SpawnClass(name)
            spawn_list.push(spawn)
        }
        return spawn_list
    },

    scan_creeps(room) {
        var creep_list = []
        var obj_list = room.find(FIND_MY_CREEPS)
        for (var i in obj_list) {
            var creep = new CreepClass(obj_list[i].name)
            creep_list.push(creep)
        }
        return creep_list
    },

    schedule() {
        var spawn_list = Scheduler.scan_spawns();
        for (var i in spawn_list) {
            var spawn = spawn_list[i]
            /* scan room of this spawn */
            var planner = new RoomPlanner(spawn.obj.room.name)
            planner.scan()
            spawn.run();
            var creep_list = Scheduler.scan_creeps(spawn.obj.room);
            /* schedule */
            for (var j in creep_list) {
                var creep = creep_list[j]
                creep.schedule()
            }
            /* run */
            for (var j in creep_list) {
                var creep = creep_list[j]
                if (CpuManager.agree())
                    creep.run()
            }
            
            if (CpuManager.agree()) {
                planner.schedule_build()
            }

            if (CpuManager.agree) {
                planner.run_build()
            }
        }
    },
}

const SystemManager = {
    VERSION : 1,
    
    init() {
        if (Memory.user == undefined ||
        Memory.user.version == undefined ||
        Memory.user.version < SystemManager.VERSION) {
            Memory.user = {}
            Memory.user.version = 0;
        }
        if (Memory.user.env == undefined) {
            Memory.user.env = {}
        }
        if (Memory.user.bug == undefined) {
            Memory.user.bug = {}
            Memory.user.bug.exist = false;
        }
        Logger.init();
        GCWorker.init();
        Scheduler.init();
        CpuManager.init();
        
        /* init done, set version */
        Memory.user.version = SystemManager.VERSION;
    },

    has_bug() {
        return (Memory.user.bug.exist)
    },

    loop() {
        SystemManager.init()
        if (SystemManager.has_bug()) {
            Logger._log("BUG! Stop...")
            return;
        }
        GCWorker.run();
        Scheduler.schedule();
    },
    /* Memory Init */
    /* Main Loop */
    /* Command */
    /* GC */
    /* CPU mamangement */
    /* Room Scan */
}

module.exports = {SystemManager, CpuManager}