var util = require('../util');
var _ = require('lodash');

exports.get = (userData, definitionService, resourceService, apiService) => {
	const serviceName = 'CityMapService';

	let buildingList = [];

	let lastRefresh = {};
	const wls = util.writeLogService(userData);

	const calculateTimeout = () => _.each(buildingList, b => util.calculateTimeout(b.state, 'next_state_transition_in'));

	const serviceMethods = {
		removeBuilding: (buildingId) => {
			const methodName = 'removeBuilding';
			wls.writeLog(`${serviceName}.${methodName}(${buildingId})`);

			const returnMessage = (msg) => {
				wls.writeLog(msg);
				return util.getEmptyPromise({status: msg});
			};

			const building = _.find(buildingList, b => b.id == buildingId);
			if (!building) {
				return returnMessage(`Usuwanie budynku id = ${buildingId} niemożliwe, nie ma na go liście budynków`);
			}
			if (building.type === 'main_building') {
				return returnMessage('Nie można usunąć budynku głównego');
			}
			if (building.type === 'residential') {
				var bt = definitionService.findBuildingDefinition(building.cityentity_id);
				if ((bt.provided_population || 0) > resourceService.getPopulation(/*resourceList.population || 0*/)) {
					return returnMessage('Nie można usunąć budynku mieszkalnego - spowodowałoby to spadek dostępnej ludności poniżej zera');
				}
			}

			return apiService.doServerRequest(serviceName, [buildingId], methodName).then(() => {
				_.remove(buildingList, b => b.id === buildingId);
			});
		},
		getEntities: () => {
			const methodName = 'getEntities';
			wls.writeLog(`${serviceName}.${methodName}()`);
			return apiService.doServerRequest(serviceName, [], methodName);
		},
		process: () => {
			util.intervalPromiseGuard(lastRefresh, 3600, serviceMethods.getEntities);
		},
		handleResponse: (rd) => {
			var handleUpdateEntity = function(responseData) {
				var myBuildingList = _.filter(responseData, b => b.player_id === userData.playerId); //TODO: Trzeba utworzyć takie pole userData.playerId!
				_.each(myBuildingList, ue => util.replaceInArray(buildingList, 'id', ue));
			};
			switch (rd.requestMethod) {
			case 'updateEntity':
				handleUpdateEntity(rd.responseData);
				break;
			case 'getEntities':
				handleUpdateEntity(rd.responseData);
				break;
			}
			calculateTimeout();
		},
		getServiceName: () => serviceName,
		setBuildingList: (bl) => {
			buildingList = bl;
		},
		getBuildingList: () => buildingList,
		updateBuildingList: newBuildingList => {
			_.each(newBuildingList, b => util.replaceInArray(buildingList, 'id', b));
			calculateTimeout();
		}
	};
	return serviceMethods;
};
