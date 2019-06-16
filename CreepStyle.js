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
            design: [WORK,WORK,WORK,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
            option: {memory: {role: 'worker', level: 3, status:'done'}},
            level: 3,
        },
        {
            design: [WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE],
            option: {memory: {role: 'worker', level: 2, status:'done'}},
            level: 2,
        },
        {
            design: [WORK, CARRY, MOVE, MOVE],
            option: {memory: {role: 'worker', level: 1, status:'done'}},
            level: 1,
        },
    ],
}


module.exports = CreepStyle