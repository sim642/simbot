function DatePlugin(bot) {
	var self = this;
	self.name = "date";
	self.help = "Date manipulation plugin";
	self.depend = [];

	self.toUTC = function(date) {
		// TODO: this breaks everything: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#Differences_in_assumed_time-zone
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

	self.durationDiff = function(dt) {
		var size = [1000, 60, 60, 24, 30, 12];

		var dur = [];
		for (var i = 0; i < size.length; i++) {
			dur.push(dt % size[i]);
			dt = Math.floor(dt / size[i]);
		}
		dur.push(dt);
		return dur;
	};

	self.durationReal = function(d1, d2) {
		var vars = ["Milliseconds", "Seconds", "Minutes", "Hours", "Date", "Month", "FullYear"];
		//bot.out.debug("date", d1, d2);

		var dur = [];
		for (var i = vars.length - 1; i >= 0; i--) {
			var cnt = 0;

			while (true) {
				var next = new Date(d1.getTime());
				next["setUTC" + vars[i]](next["getUTC" + vars[i]]() + 1);
				//bot.out.debug("date", [d1, next, d2]);

				if (next.getTime() <= d2.getTime()) {
					cnt++;
					d1 = next;
				}
				else
					break;
			}

			dur.unshift(cnt);
		}
		return dur;
	};

	self.duration = function(dur) {
		if (Object.prototype.toString.call(dur) === '[object Array]') // check for Array
			return self.durationReal(dur[0], dur[1]);
		else if (Object.prototype.toString.call(dur) === '[object Date]') // check for Date
			return self.durationReal(dur, new Date());
		else
			return self.durationDiff(dur);
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
