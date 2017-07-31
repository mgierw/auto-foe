var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, definitionService, cityResourcesService, eraService, campaignService) => {
	const serviceName = 'TradeService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	let tradeOffersArray = null;

	const getTradeOffers = () => apiService.doServerRequest(serviceName, [], 'getTradeOffers');
	const createTradeOffer = offer => apiService.doServerRequest(serviceName, [offer], 'createOffer');
	//const acceptOffer = offer => apiService.doServerRequest(serviceName, [offer], 'acceptOffer');

	var createTradeOfferObj = function(offerName, offerCount, needName, needCount) {
		return {
			__class__ : 'TradeOffer',
			clan_only : false,
			offer_created_at : 0,
			offer : util.createCityGood(offerName, offerCount),
			id : 0,
			need : util.createCityGood(needName, needCount),
			merchant : null
		};
	};

	var getMyOffers = function(myOffers) {
		if (myOffers === undefined) {
			myOffers = true;
		}
		var getMine = to => to.merchant.player_id === userData.playerId;
		var getOthers = to => to.merchant.player_id !== userData.playerId;
		return _.filter(tradeOffersArray, myOffers ? getMine : getOthers);
	};

	var getTradeResInfo = function(tradeRes) {
		var def = definitionService.findResDefinition(tradeRes.id);
		return {
			res: tradeRes,
			def: def,
			amount: cityResourcesService.getAmount(tradeRes.id),
			isDeposit: campaignService.isDeposit('raw_' + tradeRes.id),
			eraIndex: eraService.getEraIndex(def.era)
		};
	};

	var amountTemplateTable = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

	var generateTradeOffers = function() {
		if (tradeOffersArray === null) {
			return util.getEmptyPromise({});
		}
		var myOffers = getMyOffers();
		var getAmountInTradeOffers = function(good_id) {
			return _(myOffers).filter(to => to.offer.good_id === good_id).sumBy('offer.value') || 0;
		};
		var getAmountInTradeOffersNeed = function(offerId, needId) {
			return _(myOffers).filter(to => to.offer.good_id === offerId && to.need.good_id === needId).sumBy('need.value') || 0;
		};
		//var offerArray = [];
		var generatedOffer = null;
		//writeLog(`Generowanie ofert handlowych`);
		_.each(definitionService.getDefinitions().resByEra, era => {
			if (generatedOffer) {
				return false;
			}
			//writeLog(`Przeglądam zasoby dla ery ${era.eraName}`);
			var resInfoArray = _.map(era.goods, g => getTradeResInfo(g));
			var depoArray = _.filter(resInfoArray, r => r.isDeposit);
			var depoLength = depoArray.length;
			if (depoLength === 0) {
				return false;
			}
			var noDepoArray = _.filter(resInfoArray, r => !r.isDeposit);
			_.each(resInfoArray, d => {
				d.amountWithOffers = d.amount + getAmountInTradeOffers(d.res.id);
			});
			var medAmount = _.meanBy(resInfoArray, 'amountWithOffers');
			_.each(depoArray, d => {
				if (generatedOffer) {
					return false;
				}
				var amountToSell = Math.round(d.amount - medAmount);
				if (amountToSell >= 10) {
					//writeLog(`Jest potencjał do sprzedaży ${d.res.name}`);
					_.each(noDepoArray, nd => {
						if (generatedOffer) {
							return false;
						}
						var needAmount = getAmountInTradeOffersNeed(d.res.id, nd.res.id);
						var amountToBuy = medAmount - nd.amount - needAmount;
						var uniqTradeOffers = _(myOffers).filter(t => t.offer.good_id === d.res.id && t.need.good_id === nd.res.id).map(t => t.offer.value).map(a => Math.round(a / 10) * 10).uniq().sort().value();
						amountToBuy = _(amountTemplateTable).difference(uniqTradeOffers).filter(a => a <= amountToBuy).first();
						if (amountToBuy !== undefined) {
							wls.writeLog(`Przygotowuję ofertę zakupu ${amountToBuy} x ${nd.res.name} oferując ${d.res.name} w stosunku 1:1`);
							generatedOffer = createTradeOfferObj(d.res.id, amountToBuy, nd.res.id, amountToBuy);
							return false;
						}
					});
				}
			});
		});
		if (generatedOffer) {
			//writeLog(`Przygotowano ${offerArray.length} ofert handlowych.`);
			return createTradeOffer(generatedOffer);
		}
		return util.getEmptyPromise({});
	};

	const refreshGuard = util.intervalPromiseGuard2(120, getTradeOffers);

	return {
		handleResponse: (rd) => {
			var handleGetTradeOffers = function(responseData) {
				tradeOffersArray = _.filter(responseData, to => to.merchant.player_id !== -1);
			};
			var handleAcceptOffer = function(responseData) {
				wls.writeLog(`Wynik akceptacji oferty handlowej: ${responseData}`);
			};
			switch (rd.requestMethod) {
			case 'getTradeOffers':
				handleGetTradeOffers(rd.responseData);
				break;
			case 'acceptOffer':
				handleAcceptOffer(rd.responseData);
				break;
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			return refreshGuard.invoke().then(generateTradeOffers);
		},
		getMyOffers
	};
};
