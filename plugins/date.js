function DatePlugin(bot) {
	var self = this;
	self.name = "date";
	self.help = "Date manipulation plugin";
	self.depend = [];

	self.toUTC = function(date) {
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	};

	self.printDateTime = function(date) {
		return date.toISOString().replace(/T/g, " ").replace(/\.\d{3}Z/, "");
	};

	self.printDate = function(date) {
		return self.printDateTime(date).split(" ")[0];
	};

	self.printTime = function(date) {
		return self.printDateTime(date).split(" ")[1];
	};

	self.duration = function(dt) {
		var size = [1000, 60, 60, 24, 30, 12];

		var dur = [];
		for (var i = 0; i < size.length; i++) {
			dur.push(dt % size[i]);
			dt = Math.floor(dt / size[i]);
		}
		dur.push(dt);
		return dur;
	};

	self.printDur = function(dt, trim, limit) {
		var name = ["millisecond", "second", "minute", "hour", "day", "month", "year"];

		var dur = self.duration(dt);
		trim = Math.max(name.indexOf(trim), +trim || 0); // if in name then get index, otherwise use as number which defaults to 0
		limit = limit || name.length;
		var parts = [];
		for (var i = name.length - 1; i >= 0 && parts.length < limit; i--) {
			if (dur[i] > 0 && (i >= trim || parts.length === 0))
				parts.push(dur[i] + " " + name[i] + (dur[i] == 1 ? "" : "s"));
		}

		return parts.join(", ");
	};

	self.events = {

	};
}

module.exports = DatePlugin;
