var _ = require('lodash');
//var apiHelperFactory = require('../apiHelper');
var util = require('../util');

exports.get = (userData, apiHelper, afterStartGameCallback) => {
	//const apiHelper = apiHelperFactory.get(userData);
	const wls = util.writeLogService(userData);
	//let handleResponse;
	let serviceArray = [];

	const checkLogout = function(json) {
		var foundRedirect = _.find(json, (sr) => {
			return sr.__class__ === 'Redirect';
		});
		if (foundRedirect) {
			console.log(`Serwer zwrócił Redirect, message: ${foundRedirect.message}, url: ${foundRedirect.url}`);
			return foundRedirect.url;
		}
		return null;
	};

	var doApiRequestArray = function(reqDataArray) {
		return apiHelper.doApiRequestArray(reqDataArray).then(response => {
			if (response && response.json) {
				//handleResponse(response.json);
				_.each(response.json, rd => {
					_.each(serviceArray, s => {
						if (s.getServiceName() === rd.requestClass) {
							s.handleResponse(rd);
						}
					});
				});
			}
			return response;
		}).then(response => {
			var redirectUrl = checkLogout(response.json);
			if (redirectUrl) {
				wls.writeLog('Zrzut komunikatów:');
				_.each(reqDataArray, rd => {
					wls.writeLog(`${rd.requestId}, ${rd.requestMethod}, ${rd.requestClass}`);
				});
				_.each(serviceArray, s => {
					if (s.reset) {
						s.reset();
					}
				});
				return apiHelper.doStartGame(redirectUrl).then(afterStartGameCallback);
			}
			return response;
		});
	};

	var doApiRequest = function(reqData) {
		return doApiRequestArray([reqData]);
	};

	var doServerRequest = function(requestClass, requestData, requestMethod) {
		return doApiRequest(apiHelper.createServerRequest(requestClass, requestData, requestMethod));
	};
	/*
	var doServerRequestArray = function(requestClass, requestDataArray, requestMethod) {
		return doApiRequestArray(_.map(requestDataArray, requestData => apiHelper.createServerRequest(requestClass, requestData, requestMethod)));
	};
	*/
	var doServerRequestR = function(requestClass, requestData, requestMethod) {
		return doServerRequest(requestClass, requestData, requestMethod).then(response => {
			return _.get(_.find(response.json, r => r.requestClass === requestClass && r.requestMethod === requestMethod), 'responseData');
		});
	};
	var doServerRequestR2 = function(requestClass, requestData, requestMethod, requestMethodResponse) {
		return doServerRequest(requestClass, requestData, requestMethod).then(response => {
			var getResponse = (requestMethod) => {
				return _.get(_.find(response.json, r => r.requestClass === requestClass && r.requestMethod === requestMethod), 'responseData');
			};
			return {
				r1: getResponse(requestMethod),
				r2: getResponse(requestMethodResponse)
			};
		});
	};
	return {
		doApiRequestArray,
		doApiRequest,
		doServerRequest,
		doServerRequestR,
		doServerRequestR2,
		//setHandleResponseCallback: callback => handleResponse = callback,
		apiHelper,
		setServiceArray: input => serviceArray = input
	};
};