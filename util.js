var _ = require('lodash');

var renderTimeSpan = function(seconds, $case) {
	var units = [{
		seconds: ['sekunda', 'sekundy', 'sekund'],
		minutes: ['minuta', 'minuty', 'minut'],
		hours: ['godzina', 'godziny', 'godzin'],
		days: ['dzień', 'dni', 'dni']
	}, {
		seconds: ['sekundy', 'sekund', 'sekund'],
		minutes: ['minuty', 'minut', 'minut'],
		hours: ['godziny', 'godzin', 'godzin'],
		days: ['dnia', 'dni', 'dni']
	}];
	var renderUnits = function(amount, unit) {
		if (amount === 1) {
			return amount + ' ' + units[$case][unit][0];
		}
		var modulo = amount % 10;
		if (modulo >= 2 && modulo <= 4) {
			return amount + ' ' + units[$case][unit][1];
		}
		return amount + ' ' + units[$case][unit][2];
	};
	if (seconds >= 60) {
		if (seconds >= 60 * 60) {
			if (seconds >= 60 * 60 * 24) {
				return renderUnits(Math.floor(seconds / (60 * 60 * 24)), 'days');
			} else {
				return renderUnits(Math.floor(seconds / (60 * 60)), 'hours');
			}
		} else {
			return renderUnits(Math.floor(seconds / 60), 'minutes');
		}
	} else {
		return renderUnits(Math.floor(seconds), 'seconds');
	}
};

var handleError = function(errorList, msg) {
	if (msg) {
		console.error(msg);
	}
	if (errorList instanceof Error) {
		console.error(errorList.stack);
	} else if (typeof(errorList) === 'string') {
		console.error(errorList);
	} else {
		_.each(errorList, function(e) {
			console.log(e);
		});
	}
};

var getEmptyPromise = function(arg) {
	return Promise.resolve(arg);
};

var extractFlashVar = function($, variableName) {
	var reg = new RegExp(variableName + '\\\'\\: \\\'(.*)\\\'');
	var foundValue = null;
	$('script').each((i, s) => {
		var st = $(s).text();
		if (st) {
			var result = reg.exec(st);
			if (result && result.length > 1) {
				foundValue = result[1];
			}
		}
	});
	console.log(`extractFlashVar("${variableName}") = "${foundValue}"`);
	return foundValue;
};

var replaceInArray = function(arr, searchFunc, newValue) {
	if (typeof searchFunc === 'string') {
		var propName = searchFunc;
		searchFunc = function(elem) {
			return elem[propName] === newValue[propName];
		};
	}
	var index = _.indexOf(arr, _.find(arr, searchFunc));
	if (index === -1) {
		arr.push(newValue);
	} else {
		arr.splice(index, 1, newValue);
	}
};

var writeLogService = function(userData) {
	return {
		writeLog: function(msg) {
			console.log(`${userData.username}(${userData.world}): ${msg}`);
		},
		writeErr: function(msg) {
			console.error(`${userData.username}(${userData.world}): ${msg}`);
		}
	};
};

var intervalPromiseGuard = function(guardObj, intervalInSeconds, callbackReturningPromise) {
	var sysdate = (new Date()).valueOf();
	if ((guardObj.lastTick || 0) + intervalInSeconds * 1000 > sysdate) {
		return getEmptyPromise({});
	}
	guardObj.lastTick = sysdate;
	return callbackReturningPromise();
};

var intervalPromiseGuard2 = function(intervalInSeconds, callbackReturningPromise) {
	let lastTick = 0;
	return {
		invoke: () => {
			var sysdate = (new Date()).valueOf();
			if (lastTick !== 0 && lastTick + intervalInSeconds * 1000 > sysdate) {
				return getEmptyPromise({});
			}
			lastTick = sysdate;
			return callbackReturningPromise();
		}
	};
};

var calculateTimeout = function(obj, propPath) {
	var sysdate = (new Date()).valueOf();
	var propValue = _.get(obj, propPath, 0);
	if (propValue && obj.__timeout__ === undefined) {
		obj.__timeout__ = sysdate + propValue * 1000;
	}
};

var getTimeout = (remainingTimeInSeconds) => {
	var sysdate = (new Date()).valueOf();
	return sysdate + remainingTimeInSeconds * 1000;
};

exports.renderTimeSpan = renderTimeSpan;
exports.handleError = handleError;
exports.getEmptyPromise = getEmptyPromise;
exports.extractFlashVar = extractFlashVar;
exports.replaceInArray = replaceInArray;
exports.writeLogService = writeLogService;
exports.intervalPromiseGuard = intervalPromiseGuard;
exports.intervalPromiseGuard2 = intervalPromiseGuard2;
exports.calculateTimeout = calculateTimeout;
exports.getTimeout = getTimeout;
exports.createCityGood = (good_id, value) => ({__class__ : 'CityGood', value, good_id});
