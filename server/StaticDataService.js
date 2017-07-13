var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService) => {
	const serviceName = 'StaticDataService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	// 'research'
	let metadata = [];

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getMetadata') {
				metadata = rd.responseData;
			}
		},
		getServiceName: () => serviceName,
		retrieveMetaData: identifier => {
			const md = _.find(metadata, md => md.identifier === identifier);
			return apiService.networkService.doGetJson(md.url, {}).then(result => {
				return result.json;
			});
		}
	};
};
