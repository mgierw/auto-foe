var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, definitionService) => {
	const serviceName = 'ResourceService';
	const wls = util.writeLogService(userData);

	let resourceList = null;

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	const spUsageTreshold = 1;
	let carnivalTimeout = 0;
	let lastRefresh = {};

	const isCarnival = () => {
		var sysdate = (new Date()).valueOf();
		return carnivalTimeout && sysdate < carnivalTimeout;
	};
	const getAmount = goodId => _.find(resourceList, (v, k) => k === goodId);

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getPlayerResources') {
				resourceList = rd.responseData.resources;
				if (isCarnival()) {
					wls.writeLog(`Mam ${getAmount('carnival_hearts')} serc oraz ${getAmount('carnival_roses')} róż`);
				}
			} else if (rd.requestMethod === 'getResourceDefinitions') {
				definitionService.setResourceDefinitions(rd.responseData);
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			if (isCarnival()) {
				const amount = getAmount('carnival_roses');
				if (amount && amount >= spUsageTreshold) {
					wls.writeLog(`Mam ${amount} róż, wymieniam na serce.`);
					return apiService.doServerRequest('AttemptBasedEventService', [1, false], 'tryOption');
				}
				return util.intervalPromiseGuard(lastRefresh, 3600, () => apiService.doServerRequest(serviceName, [], 'getPlayerResources'));
			}
			return Promise.resolve(null);
		},
		setCarnivalTimeout: timeout => {
			carnivalTimeout = timeout;
		},
		getTavernSilverAmount: () => getAmount('tavern_silver'),
		getResourceList: () => {
			return resourceList;
		},
		decreaseSp: value => {
			resourceList['strategy_points'] -= value;
		},
		getAmount: getAmount
	};
};
