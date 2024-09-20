var logger = require("Logger.js");

module.exports = {
    MODULE_NAME:String = "EventQueue",
    VERSION:Number = 1,
    MAX_LEVEL:Number = 3,
    /* priority levels */
    P0:Number = 0,
    P1:Number = 1,
    P2:Number = 2,
    QUEUE_CONFIG:Array = [
        {length:Number = 5}, //level 0
        {length:Number = 10}, //level 1
        {length:Number = 20}, //level 2
    ],

    need_init_memory() {
        if (Memory.user.eq == undefined || Memory.user.eq.version == undefined || Memory.user.eq.version < this.VERSION)
            return true;
        return false;
    },

    init_memory() {
        if (this.need_init_memory()) {
            Memory.user.eq = {}
            Memory.user.eq.version = 0;
            Memory.user.eq.queues = [];
            for (var i = 0; i < this.QUEUE_CONFIG.length; i ++) {
                Memory.user.eq.queues[i] = {
                    rptr:Number = 0,
                    wptr:Number = 0,
                    queue:Array = [],
                    size:Number = this.QUEUE_CONFIG[i].length,
                }
            }
            Memory.user.eq.version = VERSION;
        }
    },

    wptr(queue) { return queue.wptr % queue.size;},
    rptr(queue) { return queue.rptr % queue.size;},

    push(event, priority, context) {
        if (priority >= this.MAX_LEVEL) {
            logger.warn(this, "Priority exceeded limit, downgrade to priority " + (this.MAX_LEVEL - 1));
            priority = this.MAX_LEVEL - 1;
        }

        var queue = Memory.user.eq.queues[priority];
        if (queue.wptr - queue.rptr >= queue.size) {
            logger.error(this, "Priority Queue " + priority + " is full");
            return;
        }
        
        queue[this.wptr(queue)] = {
            event:Number = event,
            context:Any = context,
        };

        queue.wptr ++;
    },
    pop(priority = undefined) {
        if (priority == undefined) {
            for (var p = 0; p < this.MAX_LEVEL; p ++) {
                var queue = Memory.user.eq.queues[p]
                if (queue.wptr == queue.rptr)
                    continue;
            }
        }
    }

}