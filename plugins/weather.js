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
					if (j.cod == 200) {
						var bits = [];
						bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
						bits.push(["humidity", j.main.humidity.toString() + "%"]);
						bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
						bits.push(["wind", j.wind.speed.toString() + "m/s " + j.wind.deg.toFixed(0).toString() + "°"]);
						bits.push(["clouds", j.clouds.all.toString() + "%"]);
						if (j.rain) {
							var str;
							if (j.rain["3h"] !== undefined)
								str = j.rain["3h"].toString() + "mm/3h";
							else if (j.rain["1h"] !== undefined)
								str = j.rain["1h"].toString() + "mm/h";

							if (str)
								bits.push(["rain", str]);
							else
								bot.out.warn("weather", j);
						}
						if (j.snow) {
							var str;
							if (j.snow["3h"] !== undefined)
								str = j.snow["3h"].toString() + "mm/3h";
							else if (j.snow["1h"] !== undefined)
								str = j.snow["1h"].toString() + "mm/h";

							if (str)
								bits.push(["snow", str]);
							else
								bot.out.warn("weather", j);
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
						bot.say(to, "No place called \x02" + args[0]);
					}
				}
			});
		},

		"cmd#forecast": function(nick, to, args) {
			var place = args[1];
			var time = new Date(args[2])
			var t = time.getTime() / 1000;

			request("http://api.openweathermap.org/data/2.5/forecast?lang=en&q=" + args[1], function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var jj = JSON.parse(body);
					if (jj.cod == 200) {
						for (var i = 0; i < jj.cnt; i++) {
							var j = jj.list[i];
							if (t >= j.dt && t < (i + 1 < jj.cnt ? jj.list[i + 1].dt : j.dt + 3 * 60 * 60)) {
								var bits = [];
								bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
								bits.push(["humidity", j.main.humidity.toString() + "%"]);
								bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
								bits.push(["wind", j.wind.speed.toString() + "m/s " + j.wind.deg.toFixed(0).toString() + "°"]);
								bits.push(["clouds", j.clouds.all.toString() + "%"]);
								if (j.rain) {
									var str;
									if (j.rain["3h"] !== undefined)
										str = j.rain["3h"].toString() + "mm/3h";
									else if (j.rain["1h"] !== undefined)
										str = j.rain["1h"].toString() + "mm/h";

									if (str)
										bits.push(["rain", str]);
									else
										bot.out.warn("weather", j);
								}
								if (j.snow) {
									var str;
									if (j.snow["3h"] !== undefined)
										str = j.snow["3h"].toString() + "mm/3h";
									else if (j.snow["1h"] !== undefined)
										str = j.snow["1h"].toString() + "mm/h";

									if (str)
										bits.push(["snow", str]);
									else
										bot.out.warn("weather", j);
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

								var str = "\x02" + jj.city.name + ", " + jj.city.country + " @ " + time.toUTCString() + ": \x02";
								for (var i = 0; i < bits.length; i++) {
									str += self.formatPair(bits[i][0], bits[i][1]);
									if (i != bits.length - 1)
										str += ", ";
								}

								bot.say(to, str);
								return;
							}
						}

						bot.say(to, "No forecast found for \x02" + jj.city.name + ", " + jj.city.country + " @ " + time.toUTCString());
					}
					else {
						bot.say(to, "No place called \x02" + place);
					}
				}
			});
		}
	}
}

module.exports = WeatherPlugin;
