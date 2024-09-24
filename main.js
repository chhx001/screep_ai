const { SystemManager } = require("./SystemManager")
const Logger = require("./Logger")

function stop() {
    //console.log("Stopped");
}

module.exports.loop = SystemManager.loop