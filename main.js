
var SpawnPolicy = require('SpawnPolicy')
var WorkerAI = require('WorkerAI')
var Environment = require('Environment')
var TowerAI = require("TowerAI")
var log = require('Log')
var BuildPolicy = require("BuildPolicy")

module.exports.loop = function () {
    Environment.run()
    SpawnPolicy.spawnCreep()

    _.forEach(Game.creeps, (c) => {
        if (c.id) {
            WorkerAI.run(c)
        }
    })
        
    _.forEach(Game.spawns, (v, k) => {
        BuildPolicy.markSite(v)
    })

    _.forEach(Game.structures, (s) => {
        TowerAI.run(s)
    })
}