var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService) => {
	const serviceName = 'HiddenRewardService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	let hiddenRewards = [];

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getOverview') {
				hiddenRewards = _.get(rd, 'responseData.hiddenRewards', []);
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			const sysdate = (new Date()).valueOf();
			const reqArray = _(hiddenRewards).filter(hr => {
				return hr.expireTime * 1000 > sysdate;
			}).map(hr => apiService.apiHelper.createServerRequest(serviceName, [hr.hiddenRewardId], 'collectReward')).value();
			if (reqArray.length) {
				hiddenRewards = [];
				return apiService.doApiRequestArray(reqArray);
			}
			return util.getEmptyPromise(null);
		}
	};
};
