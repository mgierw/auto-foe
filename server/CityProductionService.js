var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, cityMapService, definitionService, resourceService) => {
	const serviceName = 'CityProductionService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	const isBuildingStateTimedOut = function(b) {
		var sysdate = (new Date()).valueOf();
		//var diff = (b.state.__timeout__ || 0) - sysdate;
		return b.state.__timeout__ && b.state.__timeout__ < sysdate;
	};

	const startProductionSupplies = function() {
		//var sysdate = (new Date()).valueOf();
		//writeLog('startProductionSupplies');
		var checkIfValidState = function(b) {
			return (b.type === 'production' || b.type === 'goods' || b.type === 'residential' || b.type === 'random_production');
		};

		var reqList = _(cityMapService.getBuildingList()).filter(b => {
			//var buildingDefinition = findBuildingDefinition(b.cityentity_id);
			//writeLog('\tBudynek: ' + buildingDefinition.name);
			if (checkIfValidState(b) && b.connected) {
				//writeLog('\t\tJest właściwego typu i jest połączony z głównym budynkiem');
				if (b.state.__class__ === 'IdleState') {
					//writeLog('\t\tJest bezczynny');
					return true;
				} else if (b.state.__class__ === 'ConstructionState' && isBuildingStateTimedOut(b)) {
					//writeLog('\t\tJest w trakcie budowy, która się zakończyła');
					return true;
				} else {
					//writeLog('\t\tNie spełnia wymagań stanu');
					return false;
				}
			} else {
				//writeLog('\t\tNie jest właściwego typu');
				return false;
			}
		}).map(b => {
			var buildingDefinition = definitionService.findBuildingDefinition(b.cityentity_id);
			if (!buildingDefinition) {
				wls.writeLog(`Unknown definition for ${b.cityentity_id}`);
				return;
			}
			var shortestTimeProductionWithoutRequirements = _(buildingDefinition.available_products).filter(ap => {
				//writeLog('\t\tap.deposit_id = ' + ap.deposit_id);
				var settingProdId = (userData.settings || {})[b.id];
				if (settingProdId !== undefined && settingProdId != -1) {
					return settingProdId == (ap.production_option || 0);
				}
				//return ap.requirements === undefined || (ap.deposit_id && isDeposit(ap.deposit_id));
				return true;
			}).minBy(ap => {
				return ap.production_time;
			});
			if (shortestTimeProductionWithoutRequirements) {
				//writeLog('Przygotowuję produkcję: ' + buildingDefinition.name + ' - ' + shortestTimeProductionWithoutRequirements.name);
				return apiService.apiHelper.createServerRequest(serviceName, [b.id, (shortestTimeProductionWithoutRequirements.production_option || 0)], 'startProduction');
			}
			return null;
		}).filter(r => {
			return r;
		}).value();
		if (reqList.length) {
			return apiService.doApiRequestArray(reqList);
		}
		return util.getEmptyPromise(null);
	};

	const collectProduction = function() {
		//writeLog('collectProduction');

		var checkStrategyPointOverflow = function(b) {
			var sp = _.get(b, 'state.current_product.revenue.strategy_points.currentSP');
			if (sp !== undefined) {
				let rsp = resourceService.getSpAmount();
				return (rsp || 0) + sp <= 10; //TODO: Obtain maximum numer of SP from server: ResourceService, getResourceDefinitions
			} else {
				return true;
			}
		};

		var buildingIdList = _(cityMapService.getBuildingList()).filter(b => {
			if (b.state.__class__ === 'ProductionFinishedState') {
				return checkStrategyPointOverflow(b);
			}
			if (b.state.__class__ === 'ProducingState') {
				//var bd = findBuildingDefinition(b.cityentity_id);
				if (isBuildingStateTimedOut(b)) {
					return checkStrategyPointOverflow(b);
				} else {
					//writeLog('Do zbioru produkcji z [' + bd.name + '] brakuje ' + util.renderTimeSpan(diff / 1000, 1));
				} 
			}
			return false;
		}).map(b => {
			//var bd = findBuildingDefinition(b.cityentity_id);
			//writeLog('Zbieranie produkcji z: ' + bd.name);
			return b.id;
		}).value();
		//writeLog(buildingIdList);
		//findBuildingDefinition(b.cityentity_id)
		if (buildingIdList.length) {
			return apiService.doServerRequest(serviceName, [buildingIdList], 'pickupProduction');
		}
		return util.getEmptyPromise(null);
	};

	const removePlunderedState = function() {
		var buildingIdList = _(cityMapService.getBuildingList()).filter(b => b.state.__class__ === 'PlunderedState').map(b => {
			var bd = definitionService.findBuildingDefinition(b.cityentity_id);
			wls.writeLog('Naprawianie budynku po splądrowaniu: ' + bd.name);
			return b.id;
		}).value();
		if (buildingIdList.length) {
			return apiService.doServerRequest(serviceName, buildingIdList, 'removePlunderedProduction');
		}
		return util.getEmptyPromise(null);
	};


	return {
		handleResponse: (rd) => {
			if (rd.responseData.__class__ === 'CityProductionResult') {
				cityMapService.updateBuildingList(rd.responseData.updatedEntities);
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			return collectProduction().then(removePlunderedState).then(startProductionSupplies);
		}
	};
};
