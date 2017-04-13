/* global setTimeout */
'use strict';

var util = require('./util');
//var _ = require('lodash');
var iconFilenameMappings = require('./icon-filename-mapping');
var nameMappingPl = require('./nameMappingPl');
var apiHelperFactory = require('./apiHelper');
var eraService = require('./common/EraService');

var createService = function(userData) {
	var paused = false;
	var apiHelper = apiHelperFactory.get(userData);

	const wls = util.writeLogService(userData);

	let afterStartGameCallback = (result) => {
		userData.worldObj = result.world;
		userData.worldName = userData.worldObj.name;
		return invokeGetData();
	};

	let serviceArray = [];

	const definitionService = require('./server/DefinitionService').get(userData); serviceArray.push(definitionService);
	const apiService = require('./server/ApiService').get(userData, apiHelper, afterStartGameCallback);// serviceArray.push(apiService);
	const cityResourcesService = require('./server/CityResourcesService').get(userData, apiService); serviceArray.push(cityResourcesService);
	const cityMapService = require('./server/CityMapService').get(userData, definitionService, cityResourcesService, apiService); serviceArray.push(cityMapService);
	const resourceService = require('./server/ResourceService').get(userData, apiService, definitionService); serviceArray.push(resourceService);
	const treasureHuntService = require('./server/TreasureHuntService').get(userData, apiService); serviceArray.push(treasureHuntService);
	const otherPlayerService = require('./server/OtherPlayerService').get(userData, apiService, definitionService); serviceArray.push(otherPlayerService);
	const cityProductionService = require('./server/CityProductionService').get(userData, apiService, cityMapService, definitionService, cityResourcesService); serviceArray.push(cityProductionService);
	const researchService = require('./server/ResearchService').get(userData, apiService, cityResourcesService); serviceArray.push(researchService);
	const friendsTavernService = require('./server/FriendsTavernService').get(userData, apiService, otherPlayerService, resourceService, researchService); serviceArray.push(friendsTavernService, researchService);
	const friendService = require('./server/FriendService').get(userData, apiService, otherPlayerService); serviceArray.push(friendService);
	const tradeService = require('./server/TradeService').get(userData, apiService, definitionService, cityResourcesService, eraService); serviceArray.push(tradeService);
	const hiddenRewardService = require('./server/HiddenRewardService').get(userData, apiService); serviceArray.push(hiddenRewardService);
	const startupService = require('./server/StartupService').get(userData, apiService, cityMapService, definitionService, cityResourcesService, resourceService); serviceArray.push(startupService);
	const campaignService = require('./server/CampaignService').get(userData, apiService, cityResourcesService, eraService); serviceArray.push(campaignService);
	const greatBuildingsService = require('./server/GreatBuildingsService').get(userData, apiService, definitionService, cityResourcesService, cityMapService, otherPlayerService); serviceArray.push(greatBuildingsService);

	if(userData.services) {
		serviceArray = serviceArray.filter(service => userData.services[service.getServiceName()] != false);
	}

	apiService.setServiceArray(serviceArray);

	var startAccount = function() {
		return apiHelper.startAccount(userData).then(result => {
			if (result && result.status && result.status === 'ACCOUNT_STARTED') {
				return afterStartGameCallback(result);
			}
			return result;
		});
	};

	var isLogged = false;
	var user_data = null;

	var timeoutInterval = 5;
	var setAutoTimeout = function() {
		setTimeout(timeoutFunction, timeoutInterval * 1000);
	};
	var timeoutFunction = function() {
		if (isLogged && !paused) {
			processAutomaticActions().then(() => {
				setAutoTimeout();
			}, (reason) => {
				wls.writeLog('Exception from automatic processing');
				if (reason instanceof Error) {
					wls.writeLog(reason.stack);
				} else {
					wls.writeLog(reason);
				}
				setAutoTimeout();
			});
			return;
		}
		setAutoTimeout();
	};
	setAutoTimeout();

	var invokeGetData = function() {
		wls.writeLog('Call invokeGetData');
		return startupService.getData().then(result => {
			user_data = result.user_data;
			userData.era = user_data.era.era;
			userData.eraName = eraService.getEraName(user_data.era.era);
			isLogged = true;
			return result;
		});
	};

	var deleteBuilding = (query) => {
		return cityMapService.removeBuilding(query.bldId).then(() => ({status: 'OK'}));
	};

	var checkOption = (service) => {
		if(userData.services[service.getServiceName()] != false) return service.process;
	}

	var processAutomaticActions = function() {
		return util.getEmptyPromise({})
			.then(checkOption(cityProductionService))
			.then(otherPlayerService.process)
			.then(checkOption(hiddenRewardService))
			.then(checkOption(researchService))
			.then(checkOption(greatBuildingsService))
			.then(checkOption(tradeService))
			.then(checkOption(campaignService))
			.then(checkOption(cityMapService))
			.then(checkOption(resourceService))
			.then(checkOption(treasureHuntService))
			.then(checkOption(friendsTavernService));
	};


	var resumeAccount = function() {
		wls.writeLog('Off Pause');
		paused = false;
		return util.getEmptyPromise({
			status: 'OK'
		});
	};

	var pauseAccount = function() {
		wls.writeLog('On Pause');
		paused = true;
		return util.getEmptyPromise({
			status: 'OK'
		});
	};

	var getBasePath = () => {
		return apiHelper.getBasePath();
	};

	var getDefinitions = function() {
		if (!userData) {
			return util.getEmptyPromise({});
		}
		return util.getEmptyPromise({
			city_entities: definitionService.getDefinitions().buildings,
			resDefinitions: definitionService.getDefinitions().resources,
			basePath: getBasePath(),
			iconFilenameMappings: iconFilenameMappings.data,
			nameMappingPl: nameMappingPl.data
		});
	};

	var getAccountData = function() {
		if (!userData) {
			return util.getEmptyPromise({});
		}
		return util.getEmptyPromise({
			buildingList: cityMapService.getBuildingList(),
			resourceList: cityResourcesService.getResourceList(),
			settings: userData.settings || {},
			paused: paused,
			researchArray: researchService.getResearchArray(),
			user_data: user_data,
			neighbourList: otherPlayerService.getNeighborList(),
			tradeOffersArray: tradeService.getMyOffers(true),
			otherOffersArray: tradeService.getMyOffers(false),
			campaign: campaignService.getCampaignData(),
			acceptedTrades: otherPlayerService.getAcceptedTrades(),
			world: userData.worldObj,
			tavernData: friendsTavernService.getData()
		});
	};

	var setProduction = function(setting) {
		if (!userData.settings) {
			userData.settings = {};
		}
		userData.settings[setting.id] = setting.production_id;
		return util.getEmptyPromise(userData.settings);
	};

	return {
		startAccount: startAccount,
		pauseAccount: pauseAccount,
		resumeAccount: resumeAccount,
		getDefinitions: getDefinitions,
		getAccountData: getAccountData,
		setProduction: setProduction,
		deleteBuilding: deleteBuilding
	};
};

exports.get = createService;
