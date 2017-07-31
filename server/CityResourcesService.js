var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, resourceService) => {
	const serviceName = 'CityResourcesService';
	const wls = util.writeLogService(userData);

	let resourceList = null;

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	const convertCityResource = function(cr) {
		if (!cr) {
			return [];
		}
		var ommitProperties = [
			'__class__',
			'goods',
			'good',
			'seasonal_resource_vo'//,
			//'strategy_points'
		];
		var createCityGood = function(good_id, value) {
			return {
				__class__: 'CityGood',
				good_id: good_id,
				value: value
			};
		};
		var retVal = _(cr).map((x, k) => createCityGood(k, x)).filter(x => !_.find(ommitProperties, p => p === x.good_id)).value().concat(cr.goods || []);
		//if (cr.strategy_points) {
		//	retVal.push(createCityGood('strategy_points', cr.strategy_points.currentSP || 0));
		//}
		if (cr.seasonal_resource_vo) {
			retVal.push(createCityGood('seasonal_resource_vo', cr.seasonal_resource_vo.seasonal_resource || 0));
		}
		return retVal;
	};
	const getResourceListUnion = () => resourceService.getResourceList();

	const getResources = () => apiService.doServerRequest(serviceName, [], 'getResources');

	const refreshGuard = util.intervalPromiseGuard2(60, getResources);

	let getSpAmount = () => resourceService.getAmount('strategy_points');

	let spUsageTreshold = 5;

	return {
		handleResponse: (rd) => {
			const handleGetResources = function(responseData) {
				resourceList = responseData[0];
			};
			switch (rd.requestMethod) {
			case 'getResources':
				handleGetResources(rd.responseData);
				break;
			}
		},
		getServiceName: () => serviceName,
		getPopulation: () => resourceList.population || 0,
		getSpAmount: getSpAmount,
		//getSp: () => resourceList.strategy_points,
		//setSp: newValue => resourceList.strategy_points = newValue,
		//isDeposit: deposit_id => !!_.find(resourceList.goods, g => g.good_id === deposit_id),
		getResourceList: () => resourceList,
		setResourceList: newValue => resourceList = newValue,
		getAmount: good_id => {
			var foundRes = _.find(convertCityResource(getResourceListUnion()), r => r.good_id === good_id);
			return foundRes ? (foundRes.value || 0) : 0;
		},
		isPossibleToSpendSp: () => getSpAmount() >= spUsageTreshold,
		decreaseSp: value => resourceService.decreaseSp(value),
		getResources: getResources,
		process: () => {
			return refreshGuard.invoke();
		},
		getResourceListUnion: getResourceListUnion
	};
};
