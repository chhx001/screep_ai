const Logger = require("./Logger")


class RingBuffer {
    constructor(memory, parent_module) {
        this.mem = memory
        this.MODULE_NAME = parent_module
        this.dirty = false
    }

    init(priority, size) {
        this.priority = priority
        this.size = size
        this.queue = []
        this.rptr = 0
        this.wptr = 0
        this.dirty = true
    }

    save(force = false) {
        if (!force && !this.dirty)
            return
        this.mem.priority = this.priority
        this.mem.queue = this.queue
        this.mem.size = this.size
        this.mem.rptr = this.rptr
        this.mem.wptr = this.wptr
    }

    load() {
        this.priority = this.mem.priority
        this.queue = this.mem.queue
        this.rptr = this.mem.rptr
        this.wptr = this.mem.wptr
        this.size = this.mem.size
    }

    is_full() {
        return (this.wptr - this.rptr > this.size)
    }

    is_empty() {
        return ((this.wptr - this.rptr) <= 0)
    }

    push(content) {
        if (this.is_full()) {
            Logger.warn(this, "RingBuffer full when pushing, drop....")
        }
        this.queue[this.wptr % this.size] = {
            content: content
        }
        this.wptr ++
        this.dirty = true
    }

    top() {
        if (this.is_empty())
            return null
        return this.queue[this.rptr % this.size].content
    }

    pop() {
        if (this.is_empty()) {
            Logger.warn(this, "RingBuffer empty when popping, drop....")
        }
        var ret = this.top()
        var rptr = this.rptr
        this.rptr ++
        this.queue[rptr % this.size].content = {}   /* remove content to save memory */
        this.dirty = true
        return ret
    }
}


module.exports = class PrioritizedQueue {
    constructor(memory) {
        this.mem = memory
        this.dirty = false
    }

    init(max_priority, queue_size_list, module_name="PrioritizedQueue") {
        this.max_priority = max_priority
        this.MODULE_NAME = module_name
        this.queue_list = []
        this.dirty = true

        this.mem.queue_list = []
        this.mem.max_priority = this.max_priority
        this.mem.module_name = this.MODULE_NAME
        for (var i = 0;i < this.max_priority; i ++) {
            this.mem.queue_list.push({})
            var temp = new RingBuffer(this.mem.queue_list[i], this.MODULE_NAME)
            temp.init(i, queue_size_list[i])
            this.queue_list.push(temp);
        }
        Logger.debug(this, "pq.mem.max_priority=" + this.mem.max_priority)
    }

    load() {
        this.max_priority = this.mem.max_priority
        this.MODULE_NAME = this.mem.module_name
        this.queue_list = []
        for (var i = 0;i < this.max_priority; i ++) {
            var rb = new RingBuffer(this.mem.queue_list[i], this.MODULE_NAME)
            rb.load()
            this.queue_list.push(rb)
        }
    }

    save(force=false) {
        if (!force && !this.dirty)
            return
        this.mem.max_priority = this.max_priority
        this.mem.module_name = this.MODULE_NAME
        for (var i = 0;i < this.max_priority; i ++) {
            var rb = this.queue_list[i]
            rb.save()
        }
    }

    push(content, priority) {
        var rb = this.queue_list[priority]
        if (rb.is_full()) {
            Logger.warn(this, "Prioritized Queue is full when pushing, drop....")
            return;
        }
        rb.push(content)
        this.dirty = true
    }

    top_rb() {
        var ret = null
        for (var i = 0;i < this.max_priority; i ++) {
            var rb = this.queue_list[i]
            if (rb.is_empty())
                continue
            break
        }
        return rb
    }

    top() {
        var rb = this.top_rb()
        if (rb) {
            return rb.top()
        } else {
            return null
        }
    }

    pop() {
        var rb = this.top_rb()
        if (rb) {
            this.dirty = true
            return rb.pop()
        } else
            return null
    }
    
}