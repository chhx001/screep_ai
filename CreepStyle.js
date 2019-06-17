var cost_dict = {
    work: 100,
    move: 50,
    carry: 50,
    attack: 80,
    ranged_attack: 150,
    heal: 250,
    claim: 600,
    tough: 10,
}

var get_cost = function(style) {
    var total_cost = 0
    for (var no in style.design) {
        total_cost += BODYPART_COST[style.design[no]]
    }
    return total_cost
}

var CreepStyle = {
    getCost : get_cost,

    worker: [
        {
            design: [WORK,WORK,WORK,WORK,WORK,  //500
                CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,  //450
                MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], //550
            option: {memory: {role: 'worker', level: 5, status:'done'}},
            level: 5,
        },
        {
            design: [WORK,WORK,WORK,WORK, //400
                CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,  //400
                MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE], //500
            option: {memory: {role: 'worker', level: 4, status:'done'}},
            level: 4,
        },
        {
            design: [WORK,WORK,WORK,
                CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,
                MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE],
            option: {memory: {role: 'worker', level: 3, status:'done'}},
            level: 3,
        },
        {
            design: [WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
            option: {memory: {role: 'worker', level: 1, status:'done'}},
            level: 2,
        },
        {
            design: [WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
            option: {memory: {role: 'worker', level: 1, status:'done'}},
            level: 1,
        },
        {
            design: [WORK, CARRY, MOVE, MOVE],
            option: {memory: {role: 'worker', level: 0, status:'done'}},
            level: 0,
        },
    ],
    getPartNum: (design, part) => {
        var ret = 0
        _.forEach(design, (p) => {
            if (p == part)
                ret ++
        })
        return ret
    },
}


module.exports = CreepStyle