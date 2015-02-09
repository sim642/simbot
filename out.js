var clc = require("cli-color");
var fs = require("fs");
var util = require("util");

var out = module.exports = {};

out.file = fs.createWriteStream("./data/simbot.log", {flags: 'a'});

out.time = function() {
	return new Date().toISOString();
};

out.wrapper = function(type, color, module, message) {
	if (!(typeof(message) === "string" || message instanceof String))
		message = util.inspect(message, {colors: true});
	console.log(clc.blackBright(out.time()) + " " + color("[" + type + ":") + color.bold(module) + color("] ") + message);
	out.file.write(out.time() + " [" + type + ":" + module + "] " + message + "\n", 'utf8');
};

out.log = function(module, message) {
	out.wrapper("LOG", clc.cyan, module, message);
};

out.doing = function(module, message) {
	out.wrapper("DOING", clc.cyanBright, module, message);
};

out.ok = function(module, message) {
	out.wrapper("OK", clc.greenBright, module, message);
};

out.debug = function(module, message) {
	out.wrapper("DEBUG", clc.magentaBright, module, message);
};

out.warn = function(module, message) {
	out.wrapper("WARN", clc.yellowBright, module, message);
};

out.error = function(module, message) {
	out.wrapper("ERROR", clc.redBright, module, message);
};
