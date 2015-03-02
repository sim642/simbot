var clc = require("cli-color");
var fs = require("fs");
var util = require("util");

var out = module.exports = {};

out.file = fs.createWriteStream("./data/simbot.log", {flags: 'a'});

out.time = function() {
	return new Date().toISOString();
};

out.ignores = [];

out.wrapper = function(type, color) {
	return function() {
		var args = Array.prototype.slice.call(arguments);
		var module = args.shift();

		var print = !out.ignores.some(function(re) {
			return type.match(re);
		});

		args.forEach(function(message) {
			if (!(typeof(message) === "string" || message instanceof String))
				message = util.inspect(message, {colors: true});

			if (print)
				console.log(clc.blackBright(out.time()) + " " + color("[" + type + ":") + color.bold(module) + color("] ") + message);

			out.file.write(out.time() + " [" + type + ":" + module + "] " + message + "\n", 'utf8');
		});
	};
};

out.log = out.wrapper("LOG", clc.cyan);
out.doing = out.wrapper("DOING", clc.cyanBright);
out.ok = out.wrapper("OK", clc.greenBright);
out.debug = out.wrapper("DEBUG", clc.magentaBright);
out.warn = out.wrapper("WARN", clc.yellowBright);
out.error = out.wrapper("ERROR", clc.redBright);

