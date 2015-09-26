var request = require("request");

function WeatherPlugin(bot) {
	var self = this;
	self.name = "weather";
	self.help = "Weather plugin";
	self.depend = ["cmd", "bits", "date"];
	
	self.DateUTC = bot.plugins.date.toUTC;

	self.events = {
		"cmd#weather": function(nick, to, args) {
			request("http://api.openweathermap.org/data/2.5/weather?lang=en&q=" + args[0], function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					if (j.cod == 200) {
						var prefix = j.name + ", " + j.sys.country;
						var bits = [];

						bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
						bits.push(["humidity", j.main.humidity.toString() + "%"]);
						bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
						bits.push(["wind", j.wind.speed.toString() + "m/s" + (j.wind.gust ? " (" + j.wind.gust.toString() + "m/s)" : "") + (j.wind.deg ? " " + j.wind.deg.toFixed(0).toString() + "°" : "")]);
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

						bot.say(to, bot.plugins.bits.format(prefix, bits));
					}
					else {
						bot.say(to, "No place called \x02" + args[0]);
					}
				}
			});
		},

		"cmd#forecast": function(nick, to, args) {
			var place = args[1];
			var time = new Date(args[2]);
			var t = time.getTime() / 1000;

			request("http://api.openweathermap.org/data/2.5/forecast?lang=en&q=" + place, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var jj = JSON.parse(body);
					if (jj.cod == 200) {
						for (var i = 0; i < jj.cnt; i++) {
							var j = jj.list[i];
							if (t >= j.dt && t < (i + 1 < jj.cnt ? jj.list[i + 1].dt : j.dt + 3 * 60 * 60)) {
								var prefix = jj.city.name + ", " + jj.city.country + " @ " + bot.plugins.date.printDateTime(time);
								var bits = [];

								bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
								bits.push(["humidity", j.main.humidity.toString() + "%"]);
								bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
								bits.push(["wind", j.wind.speed.toString() + "m/s " + (j.wind.gust ? "(" + j.wind.gust.toString() + "m/s)" : "") + j.wind.deg.toFixed(0).toString() + "°"]);
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

								bot.say(to, bot.plugins.bits.format(prefix, bits));
								return;
							}
						}

						bot.say(to, "No forecast found for \x02" + jj.city.name + ", " + jj.city.country + " @ " + bot.plugins.date.printDateTime(time));
					}
					else {
						bot.say(to, "No place called \x02" + place);
					}
				}
			});
		},

		"cmd#forecast2": function(nick, to, args) {
			var place = args[1];
			var time = new Date(args[2]);
			var t = time.getTime() / 1000;

			request("http://api.openweathermap.org/data/2.5/forecast/daily?lang=en&q=" + place, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var jj = JSON.parse(body);
					if (jj.cod == 200) {
						for (var i = 0; i < jj.cnt; i++) {
							var j = jj.list[i];
							if (t >= j.dt && t < (i + 1 < jj.cnt ? jj.list[i + 1].dt : j.dt + 24 * 60 * 60)) {
								var prefix = jj.city.name + ", " + jj.city.country + " @ " + bot.plugins.date.printDateTime(time);
								var bits = [];

								bits.push(["temperature", (j.temp.day - 273.15).toFixed(1) + "°C"]); // TODO: time of day temperature
								bits.push(["humidity", j.humidity.toString() + "%"]);
								bits.push(["pressure", j.pressure.toString() + "hPa"]);
								bits.push(["wind", j.speed.toString() + "m/s " + j.deg.toFixed(0).toString() + "°"]);
								bits.push(["clouds", j.clouds.toString() + "%"]);
								if (j.rain !== undefined) {
									bits.push(["rain", j.rain.toString() + "mm/3h"]); // correct unit?
								}
								if (j.snow) {
									bits.push(["snow", j.snow.toString() + "mm/3h"]); // correct unit?
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

								bot.say(to, bot.plugins.bits.format(prefix, bits));
								return;
							}
						}

						bot.say(to, "No forecast found for \x02" + jj.city.name + ", " + jj.city.country + " @ " + bot.plugins.date.printDateTime(time));
					}
					else {
						bot.say(to, "No place called \x02" + place);
					}
				}
			});
		},

		"cmd#whistory": function(nick, to, args) {
			var place = args[1];
			var time = new Date(args[2]);
			var t = time.getTime() / 1000;

			request("http://api.openweathermap.org/data/2.5/history/city/?lang=en&type=tick&cnt=1&start=" + t + "&q=" + place, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var jj = JSON.parse(body);
					if (jj.cod == 200) {
						if (jj.cnt > 0) {
							var j = jj.list[0];

							var prefix = place + " @ " + bot.plugins.date.printDateTime(time);
							var bits = [];

							bits.push(["temperature", (j.main.temp - 273.15).toFixed(1) + "°C"]);
							bits.push(["humidity", j.main.humidity.toString() + "%"]);
							bits.push(["pressure", j.main.pressure.toString() + "hPa"]);
							bits.push(["wind", j.wind.speed.toString() + "m/s " + (j.wind.gust ? "(" + j.wind.gust.toString() + "m/s)" : "") + j.wind.deg.toFixed(0).toString() + "°"]);
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

							bot.say(to, bot.plugins.bits.format(prefix, bits));
						}
						else {
							bot.say(to, "No forecast found for \x02" + place + " @ " + bot.plugins.date.printDateTime(time));
						}
					}
					else {
						bot.say(to, "No place called \x02" + place);
					}
				}
			});
		},
	};
}

module.exports = WeatherPlugin;
