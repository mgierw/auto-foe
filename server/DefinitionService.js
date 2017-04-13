var util = require('../util');
var _ = require('lodash');
var eraService = require('../common/EraService');

exports.get = (userData) => {
	const serviceName = 'DefinitionService';

	const definitions = {
		buildings: null,
		resources: null,
		resByEra: null
	};

	const wls = util.writeLogService(userData);

	wls.writeLog(`Uruchamiam ${serviceName} dla ${userData.username}`);

	const serviceMethods = {
		getServiceName: () => serviceName,
		/*
		handleGetData: (getData, response) => {
			definitions.buildings = getData.responseData.city_map.city_entities;
			var getResourceDefinitions = _.find(response.json, (sr) => {
				return sr.requestMethod === 'getResourceDefinitions';
			});
		},
		*/
		setBuildingDefinitions: input => definitions.buildings = input,
		setResourceDefinitions: input => {
			definitions.resources = input;
			definitions.resByEra = _(definitions.resources).map(d => d.era).uniq().filter(era => era !== 'NoAge' && era !== 'AllAge').map(era => {
				return {
					era: era,
					eraName: eraService.getEraName(era),
					eraIndex: eraService.getEraIndex(era),
					goods: _(definitions.resources).filter(d => d.era === era).value()
				};
			}).value();
		},
		getDefinitions: () => definitions,
		findBuildingDefinition: id => {
			return _.find(definitions.buildings, ce => {
				return ce.id === id;
			});
		},

		findResDefinition: id => {
			return _.find(definitions.resources, rd => {
				return rd.id === id;
			});
		}

	};
	return serviceMethods;
};
