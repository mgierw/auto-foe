var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, cityMapService, definitionService, cityResourcesService, resourceService) => {
	const serviceName = 'StartupService';
	const wls = util.writeLogService(userData);

	let carnivalTimeout = 0;

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	return {
		handleResponse: () => {

		},
		getServiceName: () => serviceName,
		process: () => {

		},
		getData: () => {
			return apiService.doServerRequestR(serviceName, null, 'getData').then(getData => {
				userData.playerId = getData.user_data.player_id;
				cityMapService.setBuildingList(getData.city_map.entities);
				definitionService.setBuildingDefinitions(getData.city_map.city_entities);
				cityResourcesService.setResourceList(getData.resources);

				const carnivalFeature = _.find(getData.feature_flags.features, f => f.feature === 'carnival_event');
				if (carnivalFeature) {
					wls.writeLog('Znaleziono karnawał');
					carnivalTimeout = util.getTimeout(carnivalFeature.time_remaining);
					resourceService.setCarnivalTimeout(util.getTimeout(carnivalFeature.time_remaining));
				}

				return getData;
			});
		},
		getCarnivalTimeout: carnivalTimeout
	};
};
