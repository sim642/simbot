var request = require("request");

function WeatherPlugin(bot) {
	var self = this;
	self.name = "weather";
	self.help = "Weather plugin";
	self.depend = ["cmd"];

	self.formatPair = function(key, value) {
		return key + ": \x02" + value + "\x02";
	};
	
	self.DateUTC = function(date) {
		return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
    };

	self.events = {
		"cmd#weather": function(nick, to, args) {
			request("http://api.openweathermap.org/data/2.5/weather?lang=en&q=" + args[0], function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					if (j.sys.country) {
						var bits = [];
						bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
						bits.push(["humidity", j.main.humidity.toString() + "%"]);
						bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
						bits.push(["wind", j.wind.speed.toString() + "m/s " + j.wind.deg.toString() + "°"]);
						bits.push(["clouds", j.clouds.all.toString() + "%"]);
						if (j.rain) {
							var str;
							if (j.rain["3h"])
								str = j.rain["3h"].toString() + "mm/3h";
							else if (j.rain["1h"])
								str = j.rain["1h"].toString() + "mm/h";
							bits.push(["rain", str]);
						}
						if (j.snow) {
							var str;
							if (j.snow["3h"])
								str = j.snow["3h"].toString() + "mm/3h";
							else if (j.snow["1h"])
								str = j.snow["1h"].toString() + "mm/h";
							bits.push(["snow", str]);
						}
						if (j.weather) {
							var val = "";
							for (var i = 0; i < j.weather.length; i++) {
								val += j.weather[i].description;
								if (i != j.weather.length - 1)
									val += ", ";
							}
							bits.push(["conditions", val]);
						}
						/*if (j.sys.sunrise) {
							var d = self.DateUTC(new Date(j.sys.sunrise * 1000));
							bits.push(["sunrise", d.toTimeString().split(" ")[0]]);
						}
						if (j.sys.sunset) {
							var d = self.DateUTC(new Date(j.sys.sunset * 1000));
							bits.push(["sunset", d.toTimeString().split(" ")[0]]);
						}*/

						var str = "\x02" + j.name + ", " + j.sys.country + ": \x02";
						for (var i = 0; i < bits.length; i++) {
							str += self.formatPair(bits[i][0], bits[i][1]);
							if (i != bits.length - 1)
								str += ", ";
						}

						bot.say(to, str);
					}
					else {
						bot.say(to, "No place called " + args[0]);
					}
				}
			});
		}
	}
}

module.exports = WeatherPlugin;
