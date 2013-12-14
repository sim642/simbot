function AgePlugin(bot) {
	var self = this;
	self.name = "age";
	self.help = "Age plugin";
	self.depend = ["cmd"];
	
	self.ago = function(date) {
		var dt = Date.now() - date.getTime();
		var ret = {};

		ret.milliseconds = dt % 1000;
		dt = Math.floor(dt / 1000);
		ret.seconds = dt % 60;
		dt = Math.floor(dt / 60);
		ret.minutes = dt % 60;
		dt = Math.floor(dt / 60);
		ret.hours = dt % 24;
		dt = Math.floor(dt / 24);

		ret.days = Math.floor(dt % 30);
		dt = Math.floor(dt / 30.42);
		ret.months = dt % 12;
		dt = Math.floor(dt / 12);
		ret.years = dt;
		/*ret.years = Math.floor(dt / 365.25);
		dt -= ret.years * 365.25;
		ret.days = Math.floor(dt % 30);
		dt = Math.floor(dt / 30.42);
		ret.months = dt;*/
		return ret;
	};

	self.DateUTC = function(date) {
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
    };

	self.events = {
		"cmd#age": function(nick, to, args) {
			var birth = self.DateUTC(new Date(args[0]));
			var ago = self.ago(birth);
			bot.say(to, nick + " is " + ago.years + " years, " + ago.months + " months, " + ago.days + " days, " + ago.hours + " hours, " + ago.minutes + " minutes, " + ago.seconds + " seconds old in UTC");
		}
	};

}

module.exports = AgePlugin;

