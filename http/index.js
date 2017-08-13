/* globals $, _, Handlebars, moment */
$(function() {
	var templates = _($('script[type=\'text/x-handlebars-template\']').get()).map(function(e) {
		return [_.camelCase($(e).attr('id').replace(/template/g, '')), Handlebars.compile($(e).html())];
	}).fromPairs().value();

	Handlebars.registerHelper('switchTavernState', function(ts) {
		if (!ts) {
			return '';
		}
		switch(ts.state) {
		case 'notUnlocked':
			return 'Niedostępne';
		case 'isSitting':
			return 'Siedzę';
		case 'noChair':
			return 'Brak krzeseł';
		case 'alreadyVisited':
			return moment(ts.nextVisitTime * 1000).format('D MMMM HH:mm:ss');
		default:
			return ts.state;
		}
	});

	var accountDataDiv = $('.account-data');
	var resStatList = $('#res-stat-list');
	var eraSelect = $('.era-select');

	var accountList = [];
	var definitions = null;
	//var defResMap;
	var accData = null;
	var selectedAccount = null;
	var ajaxParam = null;

	var effBldTypeSelect = $('.bld-type-select');

	var specialProducts = [
		'money',
		'medals',
		'supplies',
		'population',
		'premium',
		'seasonal_resource_vo',
		'strategy_points',
		'expansions',
		'happiness',
		'tavern_silver'
	];

	var buildingStates = {
		'ProducingState': 'Produkuje',
		'IdleState': 'Bezczynny',
		'ProductionFinishedState': 'Produkcja ukończona',
		'ConstructionState': 'Budowanie obiektu',
		'UnconnectedState': 'Brak połączenia z głównym budynkiem',
		'PlunderedState': 'Splądrowany',
		'PolishedState': 'Zmotywowany',
		'GreatBuildingConstructionState': 'Budowanie perły architektury'
	};

	var eraList = {
		'StoneAge': 'Stone Age',
		'BronzeAge': 'Bronze Age',
		'IronAge': 'Iron Age',
		'EarlyMiddleAge': 'Early Middle Age',
		'HighMiddleAge': 'High Middle Age',
		'LateMiddleAge': 'Late Middle Age',
		'ColonialAge': 'Colonial Age',
		'IndustrialAge': 'Industrial Age',
		'ProgressiveEra': 'Progressive Era',
		'ModernEra': 'Modern Era',
		'PostModernEra': 'Postmodern Era',
		'ContemporaryEra': 'Contemporary Era',
		'TomorrowEra': 'Tomorrow',
		'FutureEra': 'FUT|The Future',
		'ArcticFuture': 'Arctic Future',
		'OceanicFuture': 'Oceanic Future'
	};

	var eraListPl = {
		'StoneAge' : 'Epoka Kamienia',
		'BronzeAge' : 'Epoka Brązu',
		'IronAge' : 'Epoka Żelaza',
		'EarlyMiddleAge' : 'Wczesne Średniowiecze',
		'HighMiddleAge' : 'Rozkwit Średniowiecza',
		'LateMiddleAge' : 'Jesień Średniowiecza',
		'ColonialAge' : 'Epoka Kolonialna',
		'IndustrialAge' : 'Epoka Przemysłowa',
		'ProgressiveEra' : 'Epoka Postępowa',
		'ModernEra' : 'Modernizm',
		'PostModernEra' : 'Postmodernizm',
		'ContemporaryEra' : 'Współczesność',
		'TomorrowEra' : 'Epoka Jutra',
		'FutureEra' : 'FUT|Przyszłość',
		'ArcticFuture' : 'Arktyczna Przyszłość',
		'OceanicFuture': 'Oceaniczna Przyszłość'
	};

	var getEraName = function(eraSymbol) {
		return eraListPl[eraSymbol];
	};

	var getEraIndex = function(eraSymbol) {
		return _(eraList).keys().findIndex(v => v === eraSymbol);
	};

	var spinner = $('.spinner');
	var getJSON = function(url, ajaxParam, successCallback) {
		spinner.css('display', '');
		$.getJSON(url, ajaxParam, result => {
			successCallback(result);
		}).always(() => {
			spinner.css('display', 'none');
		});
	};

	(function() {
		_.each(eraListPl, (name, value) => {
			eraSelect.append(templates.option({
				name: name,
				value: value
			}));
		});
		eraSelect.change(() => {
			renderTechnologyList(eraSelect.val());
		});
	})();

	var isSpecialProduct = function(good_id) {
		return !!_.find(specialProducts, s => s === good_id);
	};

	var getAmount = function(good_id) {
		var foundRes = _.find(convertCityResource(accData.resourceList), r => r.good_id === good_id);
		return foundRes ? (foundRes.value || 0) : 0;
	};

	var accListSelect = $('#account-list').change(() => {
		var selectedUsername = accListSelect.val().split(';');
		selectedAccount = _.find(accountList, a => a.username === selectedUsername[0] && a.world === selectedUsername[1]);
		ajaxParam = {
			username: selectedAccount.username,
			world: selectedAccount.world
		};
		getDefinitionsAndAccountData();
	});

	var convertCityResource = function(cr) {
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

	var startAccountBtn = $('#startAccount').click(() => {
		startAccountBtn.prop('disabled', true);
		getJSON('/ctrl/startAccount', ajaxParam, result => {
			console.log(result);
			if (result && result.status === 'ACCOUNT_STARTED') {
				getDefinitionsAndAccountData();
			}
		});
	});

	var pauseAccountBtn = $('#pauseAccount');
	var iconSpan = pauseAccountBtn.find('span.glyphicon');
	var textSpan = pauseAccountBtn.find('span.text');

	var setupPauseButton = (isPaused) => {
		pauseAccountBtn.prop('disabled', !accData || !accData.resourceList);
		iconSpan.toggleClass('glyphicon-pause', isPaused).toggleClass('glyphicon-play', !isPaused);
		textSpan.text(isPaused ? 'Włącz pauzę' : 'Wyłącz pauzę');
	};

	pauseAccountBtn.click(() => {
		refreshBtn.prop('disabled', true);
		pauseAccountBtn.prop('disabled', true);
		var isPaused = !iconSpan.hasClass('glyphicon-pause');
		getJSON(isPaused ? '/ctrl/resumeAccount' : '/ctrl/pauseAccount', ajaxParam, result => {
			console.log(result);
			refreshBtn.prop('disabled', false);
			setupPauseButton(isPaused);
		});
	});
	var getRevenueIconDesc = function (state, compareToInventory) {
		return renderFlattenCityResource(convertCityResource(state.current_product.revenue), compareToInventory);
	};

	var renderResources = function (resources, compareToInventory) {
		return renderFlattenCityResource(_.map(resources, (v, k) => {
			return {
				good_id: k,
				value: v
			};
		}), compareToInventory);
	};

	var renderFlattenCityResource = function (t, compareToInventory) {
		var span = $('<span>');
		_.each(t, g => {
			span.append(renderSingleRes(g, compareToInventory));
		});
		return span;
	};

	var renderSingleRes = function(g, compareToInventory) {
		var rd = findResDefinition(g.good_id);
		var amount = g.value || 0;
		var textClass = 'normal';
		if (compareToInventory) {
			if (amount === 0) {
				return;
			}
			var amountInInventory = getAmount(g.good_id);
			if (amount > amountInInventory) {
				textClass = 'red';
			}
			amount += '/' + amountInInventory;
		}
		if (g.hasRaw) {
			textClass = 'green';
		}
		return $(templates.resource({
			name: rd.name,
			amount: amount,
			imgPath: getIconPath(g.good_id),
			textClass: textClass
		}));
	};

	var renderTechnologyList = function(eraSymbol) {
		//Poniżej linijka testowa, którą sobie sprawdzałem w konsoli różne typy nagród
		//_(accData.researchArray).filter(r => r.rewards && r.rewards.length).map(r => r.rewards).flatten().filter(r => r.type === "unlockable_feature").value()
		var blt = $('#technology-list').empty();
		_(accData.researchArray).filter(o => o.id !== 'root' && (!eraSymbol || (o.era && o.era === eraSymbol))).each(o => {
			var spDesc = _.get(o, 'progress.currentSP', 0) + '/' + _.get(o, 'maxSP', 0);
			var isPaid = _.get(o, 'progress.is_paid', false);
			var tr = $(templates.technology({
				id: o.id,
				name: o.name,
				isPaid: isPaid,
				spDesc: spDesc,
				assetId: o.assetId || o.id,
				basePath: definitions.basePath,
				era: getEraName(o.era)
			}));
			if (!isPaid) {
				tr.find('.payment').append(renderResources(o.requirements.resources, true));
			}
			blt.append(tr);
		});
		//https://foepl.innogamescdn.com/assets/research/technology_icons/technology_icon_hospitals.jpg
	};

	var getResidentialEfficiency = function(bt) {
		var field = bt.width * bt.length;
		var ap = bt.available_products[0];
		if (ap) {
			var time = ap.production_time || 0;
			var rev = ap.revenue.money || 0;
			if (time && field) {
				var eff = rev / (field * (time / 3600));
				return Math.round(eff * bt.provided_population) || 0;
			}
		}
		return 0;
	};

	var setupEfficencyTab = () => {
		var renderResidentialEffBuildingList = function() {
			var blt = $('#residential-eff-list').empty();
			_(definitions.city_entities)
					.filter(bt => bt.type === 'residential' && !bt.is_special && !bt.is_multi_age)
					.map(bt => ({
						bt: bt,
						eff: getResidentialEfficiency(bt)
					}))
					.orderBy(c => c.eff)
					.orderBy(c => getEraIndex(c.bt.requirements.min_era))
					.each(c => {
						var ap = c.bt.available_products[0];
						var amount = ap.revenue.money;
						var tr = $(templates.residentialEff({
							name: c.bt.name,
							era: getEraName(c.bt.requirements.min_era),
							size: c.bt.width + ' x ' + c.bt.length,
							eff: c.eff,
							level: _.get(c.bt, 'requirements.street_connection_level', '')
						}));
						tr.find('.money').append(renderSingleRes({
							good_id: 'money',
							value: Math.round(3600 * amount / ap.production_time)
						}));
						tr.find('.population').append(renderSingleRes({
							good_id: 'population',
							value: c.bt.provided_population
						}));
						tr.find('.buildCost').append(renderFlattenCityResource(convertCityResource(c.bt.requirements.resources)));
						blt.append(tr);
				//if (accData && c.bt.requirements.min_era === accData.user_data.era.era) {
				//	tr.addClass("my-era");
				//}
					});
		};
		var renderSuppliesEffBuildingList = function() {
			var blt = $('#supplies-eff-list').empty();
			var getEff = (bt) => {
				var ap = bt.available_products[0];
				var time = ap.production_time || 0;
				var rev = ap.revenue.supplies || 0;
				var field = bt.width * bt.length;
				if (time && field) {
					var eff = rev / (field * (time / 3600));
					eff = Math.round(eff);
					return eff;
				}
				return 0;
			};
			_(definitions.city_entities)
					.filter(bt => bt.type === 'production' && !bt.is_special && !bt.is_multi_age)
					.map(bt => ({
						bt: bt,
						eff: getEff(bt)
					}))
					.orderBy(c => c.eff)
					.orderBy(c => getEraIndex(c.bt.requirements.min_era))
					.each(c => {
						var ap = c.bt.available_products[0];
						var amount = ap.revenue.supplies;
						var tr = $(templates.suppliesEff({
							name: c.bt.name,
							era: getEraName(c.bt.requirements.min_era),
							eff: c.eff,
							effPerPopulation: Math.round(100 * c.eff / c.bt.requirements.resources.population),
							size: c.bt.width + ' x ' + c.bt.length,
							prodTime: moment.duration(ap.production_time * 1000).humanize(),
							level: _.get(c.bt, 'requirements.street_connection_level', '')
						}));
						tr.find('.supplies').append(renderSingleRes({
							good_id: 'supplies',
							value: Math.round(3600 * amount / ap.production_time)
						}));
						tr.find('.buildCost').append(renderFlattenCityResource(convertCityResource(c.bt.requirements.resources)));
						blt.append(tr);
					});
		};
		var renderCultureEffBuildingList = function(type, template) {
			var blt = $('#' + type + '-eff-list').empty();
			var getEff = (bt) => {
				return Math.round((bt.provided_happiness || 0) / ((bt.width * bt.length) || 0));
			};
			_(definitions.city_entities)
					.filter(bt => bt.type === type && !bt.is_special && !bt.is_multi_age)
					.map(bt => ({
						bt: bt,
						eff: getEff(bt)
					}))
					.orderBy(c => c.eff)
					.orderBy(c => getEraIndex(c.bt.requirements.min_era))
					.each(c => {
						var tr = $((template || templates.cultureEff)({
							name: c.bt.name,
							era: getEraName(c.bt.requirements.min_era),
							eff: c.eff,
							size: c.bt.width + ' x ' + c.bt.length,
							level: _.get(c.bt, 'requirements.street_connection_level', '')
						}));
						tr.find('.buildCost').append(renderFlattenCityResource(convertCityResource(c.bt.requirements.resources)));
						tr.find('.happiness').append(renderSingleRes({
							good_id: 'happiness',
							value: c.bt.provided_happiness
						}));
						blt.append(tr);
					});
		};
		var tab = $('#res-eff-tab');
		effBldTypeSelect.change(() => {
			tab.find('table').hide();
			tab.find('table.' + effBldTypeSelect.val() + '-eff-table').show();
		});
		renderResidentialEffBuildingList();
		renderSuppliesEffBuildingList();
		renderCultureEffBuildingList('culture');
		renderCultureEffBuildingList('decoration');
		renderCultureEffBuildingList('street', templates.streetEff);

		effBldTypeSelect.trigger('change');
	};

	var createProductionStateDesc = function(state, d) {
		var imgSrc;
		if (d.is_special) {
			imgSrc = definitions.basePath + 'assets/city/gui/production_icons/' + state.current_product.asset_name + '.png';
		} else {
			imgSrc = '/asset/goods/small_' + state.current_product.asset_name + '.png';
		}
		return $('<img>').attr({
			src: imgSrc,
			alt: state.current_product.name,
			title: state.current_product.name
		}).addClass('prod-image');
	};

	var getAccountData = function() {
		var getStateDesc = function(state) {
			return buildingStates[state.__class__] || state.__class__;
		};

		var createProductionSelect = function(def, o) {
			if (def.available_products && def.available_products.length) {
				var select = $('<select>');
				select.append(templates.option({
					name: 'Brak',
					value: '-1'
				}));
				_.each(def.available_products, (ap) => {
					var option = templates.option({
						name: ap.name + ' (' + moment.duration(ap.production_time * 1000).humanize() + ')',
						value: ap.production_option
					});
					select.append(option);
				});
				select.change(() => {
					getJSON('/ctrl/setProduction', {
						id: o.id,
						production_id: select.val()
					}, result => {
						console.log(result);
					}, 'json');
				});
				var x = (accData.settings || {})[o.id];
				if (x !== undefined) {
					select.find('option[value=' + x + ']').prop('selected', true);
				}
				return select;
			}
			return null;
		};
		var getTimeoutDesc = function(b) {
			return getTimeoutDescState(b.state);
		};
		var getTimeoutDescState = function(state) {
			if (state.__timeout__) {
				var diff = state.__timeout__ - moment().valueOf();
				return moment.duration(diff).humanize();
			}
			return '';
		};
		var renderGoodsBuildingList = function() {
			var blt = $('#building-list').empty();
			_(accData.buildingList).filter(o => {
				return o.type === 'goods';
			}).sortBy(o => o.cityentity_id).each(o => {
				var d = findBuildingDefinition(o.cityentity_id);
				var tr = $(templates.buildingGoods({
					name: d.name,
					state: getStateDesc(o.state),
					//type: getTypeDesc(d),
					timeout: getTimeoutDesc(o)
				}));
				blt.append(tr);
				tr.find('td.avail-prod').append(createProductionSelect(d, o));
				if (o.state.__class__ === 'ProducingState') {
					tr.find('.bld-state').empty().append(createProductionStateDesc(o.state, d));
					tr.find('.bld-revenue').empty().append(getRevenueIconDesc(o.state));
				}
			});
		};
		var getProductionEfficiency = function(x, productName) {
			var field = x.d.width * x.d.length;
			var cp = _.get(x, 'b.state.current_product');
			if (cp) {
				var time = cp.production_time || 0;
				var rev = cp.revenue[productName] || 0;//
				if (time && field) {
					var eff = rev / (field * (time / 3600));
					//console.log(`Wydajność budynku ${x.d.name} wynosi ${eff} szt/h/jedn.pow.`);
					eff = Math.round(eff * 100) / 100;
					return eff;
				}
			}
			return 0;
		};

		var renderProductionBuildingList = function() {
			var blt = $('#building-production-list').empty();
			_(accData.buildingList).filter(o => {
				return o.type === 'production' || o.type === 'random_production';
			}).sortBy(o => o.cityentity_id).each(o => {
				var d = findBuildingDefinition(o.cityentity_id);
				var tr = $(templates.buildingProduction({
					name: d.name,
					state: getStateDesc(o.state),
					motivated: o.state.is_motivated,
					timeout: getTimeoutDesc(o),
					eff: getProductionEfficiency({b: o, d: d}, 'supplies')
				}));
				blt.append(tr);
				tr.find('td.avail-prod').append(createProductionSelect(d, o));
				if (o.state.__class__ === 'ProducingState') {
					tr.find('.bld-state').empty().append(createProductionStateDesc(o.state, d));
					tr.find('.bld-revenue').empty().append(getRevenueIconDesc(o.state));
				}
			});
		};
		var renderGreatBuildingList = function() {
			var blt = $('#greatbuilding-list').empty();
			_(accData.buildingList).filter(o => {
				return o.type === 'greatbuilding';
			}).sortBy(o => o.cityentity_id).each(o => {
				var d = findBuildingDefinition(o.cityentity_id);
				var tr = $(templates.greatbuilding({
					name: d.name,
					state: getStateDesc(o.state),
					timeout: getTimeoutDesc(o),
					level: o.level,
					progress: (o.state ? ((o.state.invested_forge_points || 0) + '/' + o.state.forge_points_for_level_up) : '')
				}));
				blt.append(tr);
				if (o.state.__class__ === 'ProducingState') {
					tr.find('.bld-revenue').empty().append(getRevenueIconDesc(o.state));
				}
			});
		};

		var setDeleteBuilding = function(o, d, tr) {
			if (o.state.__class__ === 'ProducingState') {
				tr.find('.bld-revenue').empty().append(getRevenueIconDesc(o.state));
			}
			if (!d.is_special && o.type !== 'main_building') {
				
				tr.find('.delete-btn').click(() => {
					var dialog = $('#dialog-confirm');
					dialog.find('span.bld-name').text(d.name);
					dialog.dialog({
						resizable: false,
						height: 'auto',
						width: 400,
						modal: true,
						buttons: {
							'Usuń': function() {
								getJSON('/ctrl/deleteBuilding', _.assign({
									bldId: o.id
								}, ajaxParam), result => {
									dialog.dialog('close');
									if (result.status === 'OK') {
										_.remove(accData.buildingList, b => b.id === o.id);
										tr.remove();
										renderResourceList();
									} else {
										let dm = $('#dialog-msg');
										dm.find('.msg').text(result.status);
										dm.dialog({
											modal: true,
											buttons: {
												Ok: () => dm.dialog('close')
											}
										});
									}
								});
							},
							Anuluj: function() {
								dialog.dialog('close');
							}
						}
					});
				});
			} else {
				tr.find('.delete-btn').remove();
			}
		};

		var renderResidentialBuildingList = function() {
			var blt = $('#residential-list').empty();
			_(accData.buildingList).filter(o => {
				return o.type === 'residential' || o.type === 'main_building';
			}).sortBy(o => o.cityentity_id).each(o => {
				var d = findBuildingDefinition(o.cityentity_id);
				var name, provided_population;
				if (o.level !== undefined) {
					var el = d.entity_levels[o.level];
					name = `${d.name} (${getEraName(el.era)})`;
					provided_population = el.provided_population;
				} else {
					name = d.name;
					provided_population = d.provided_population || 0;
				}
				var tr = $(templates.residential({
					name: name,
					state: getStateDesc(o.state),
					motivated: o.state.is_motivated,
					timeout: getTimeoutDesc(o),
					population: provided_population,
					eff: getResidentialEfficiency(d)
				}));
				blt.append(tr);
				setDeleteBuilding(o, d, tr);
			});
		};
		var getProvidedHappiness = function(b, d) {
			var provided_happiness;
			//var isMotivated = b.state.__class__ === "PolishedState";
			if (b.level !== undefined && d.entity_levels) {
				var el = d.entity_levels[b.level];
				if (el) {
					provided_happiness = el.provided_happiness || 0;
				} else {
					provided_happiness = 0;
				}
			} else {
				provided_happiness = d.provided_happiness || 0;
			}
			return provided_happiness;
		};
		var renderCultureBuildingList = function(tableElement, type) {
			var blt = tableElement.empty();
			_(accData.buildingList).filter(o => {
				return o.type === type;
			}).sortBy(o => o.cityentity_id).each(o => {
				var d = findBuildingDefinition(o.cityentity_id);
				var isMotivated = o.state.__class__ === 'PolishedState';
				var name, provided_happiness;
				if (o.level !== undefined) {
					var el = d.entity_levels[o.level];
					name = `${d.name} (${getEraName(el.era)})`;
					provided_happiness = el.provided_happiness;
				} else {
					name = d.name;
					provided_happiness = d.provided_happiness || 0;
				}
				var actHappiness = provided_happiness * (isMotivated ? 2 : 1);
				var field = d.width * d.length;
				var tr = $(templates.culture({
					name: name,
					happinessAmount: actHappiness,
					state: getStateDesc(o.state),
					motivated: isMotivated,//next_state_transition_in
					timeout: getTimeoutDesc(o),
					baseEff: Math.round(provided_happiness / field),
					actEff: Math.round(actHappiness / field)
				}));
				blt.append(tr);
				if (o.state.__class__ === 'ProducingState') {
					tr.find('.bld-revenue').empty().append(getRevenueIconDesc(o.state));
				}
				setDeleteBuilding(o, d, tr);
			});
		};
		var renderResourceList = function() {
			var renderResList = function(list, div) {
				_.each(list, r => {
					var value = r.value;
					if (value >= 1000) {
						value = (Math.round(value / 100) / 10) + 'k';
					}
					var d = findResDefinition(r.good_id);
					var name = d.name;
					if (isRaw(r)) {
						name = definitions.nameMappingPl[r.good_id];
					}
					div.append($(templates.resource({
						name: name,
						amount: value || 0,
						imgPath: getIconPath(r.good_id)
					})));
				});
			};
			var isRaw = function(r) {
				return r.good_id.startsWith('raw_');
			};
			/*
			var isNormal = function(r) {
				return !isSpecialProduct(r.good_id) && !isRaw(r);
			};
			*/
			var isSpecial = function(r) {
				return isSpecialProduct(r.good_id);
			};
			var getProductId = function(r) {
				return r.good_id;
			};
			var r = convertCityResource(accData.resourceList);
			/*
			r.push({
				good_id: 'tavern_silver',
				value: accData.tavernData.silverAmount
			});
			*/
			var hasRaw = function(resList, good_id) {
				return  !!_.some(accData.depositStates, (v, k) => k === 'raw_' + good_id && v === 2);
			};
			renderResList(_(r).filter(isSpecial).sortBy(getProductId).value(), $('#res-other-list').empty());
			var myEraIndex = getEraIndex(accData.user_data.era.era);
			var resGroups = $('#resource-groups').empty();
			_(definitions.resDefinitions).filter(d => getAmount(d.id) || hasRaw(r, d.id)).map(d => d.era).uniq().filter(era => era !== 'NoAge' && era !== 'AllAge').each(era => {
				var resRow = $(templates.resRow({})).appendTo(resGroups);
				resRow.find('.header').text(getEraName(era));
				var content = resRow.find('.content');
				_(definitions.resDefinitions).filter(d => d.era === era).each(d => {
					content.append(renderSingleRes({
						good_id: d.id,
						value: getAmount(d.id),
						hasRaw: hasRaw(r, d.id)
					}));
				});
			});
			var happiness = 0;
			_.each(accData.buildingList, b => {
				happiness += getProvidedHappiness(b, findBuildingDefinition(b.cityentity_id));
			});
			console.log(happiness);
		};
		var renderSocialList = function() {
			var findVisitor = playerId => {
				if (!accData.tavernData.tavernData) {
					return null;
				}
				return _.find(accData.tavernData.tavernData.view.visitors, v => v.player_id === playerId);
			};
			var getTavernState = playerId => _.find(accData.tavernData.tavernStates, ts => ts.ownerId === playerId);
			var list = $('#social-list').empty();
			_(accData.neighbourList).filter(n => !n.is_self).each(n => {
				list.append(templates.social({
					name: n.name,
					motivation: n.__timeout__ ? getTimeoutDescState(n) : 'Niezmotywowany',
					isFriend: n.is_friend,
					isNeighbour: n.is_neighbor,
					isGuildMember: n.is_guild_member,
					ts: getTavernState(n.player_id),
					isVisiting: !!findVisitor(n.player_id)
				}));
			});
			if (accData.tavernData.tavernData) {
				$('#tavern-info').text(`Obsadzenie tawerny: ${_.size(accData.tavernData.tavernData.view.visitors)}/${accData.tavernData.tavernData.view.unlockedChairs}`);
			}
		};
		var renderTradeList = function() {
			var list = $('#trade-list').empty();
			_(accData.tradeOffersArray).each(to => {
				var tr = $(templates.trade({
					created: moment(to.offer_created_at * 1000).format('YYYY-MM-DD HH:mm:ss')
				}));
				list.append(tr);
				tr.find('.trade-offer').empty().append(renderSingleRes({
					good_id: to.offer.good_id,
					value: to.offer.value,
				}));
				tr.find('.trade-need').empty().append(renderSingleRes({
					good_id: to.need.good_id,
					value: to.need.value,
				}));
			});
		};
		var renderAcceptedOfferList = function() {
			var list = $('#accepted-offer-list').empty();
			_(accData.acceptedTrades).each(to => {
				var tr = $(templates.acceptedOffer({
					accepted: to.date,
					party: to.other_player.name
				}));
				list.append(tr);
				tr.find('.trade-offer').empty().append(renderSingleRes({
					good_id: to.offer.good_id,
					value: to.offer.value,
				}));
				tr.find('.trade-need').empty().append(renderSingleRes({
					good_id: to.need.good_id,
					value: to.need.value,
				}));
			});
		};
		var renderCampaign = function() {
			var getProvinceById = function(pId) {
				return _.find(accData.campaign.provinces, p => p.id === pId);
			};

			var getRevardType = function(type) {
				if (!type) {
					return '';
				}
				const typeMapping = {
					'goods': 'Surowce',
					'expansion': 'Rozszerzenie',
					'loot': 'Skarb',
					'tower': 'Wieża'
				};
				return typeMapping[type];
			};

			var currentEraIndex = getEraIndex(accData.user_data.era.era);

			var pairArray = _(accData.campaign.provinces).map(sp => _.map(sp.children, c => {
				var tp = getProvinceById(c.targetId);
				if (!tp) {
					return null;
				}
				var spTime = sp.isPlayerOwned ? 600 : c.travelTime;
				var tpTime = tp.isPlayerOwned ? 600 : c.travelTime;
				return [[sp.id, c.targetId, tpTime], [c.targetId, sp.id, spTime]];
			})).flatten().filter(_.identity).flatten().filter(pair => pair[0] !== undefined && pair[1] !== undefined).value();
			var scoutedArray = _(accData.campaign.provinces).filter(p => p.isScouted).value();
			var provinceToScoutArray = _(scoutedArray).map(p => _.filter(pairArray, pa => pa[0] === p.id)).flatten().map(pa => pa[1]).uniq().map(id => getProvinceById(id)).filter(p => !p.isScouted && getEraIndex(p.era) <= currentEraIndex).filter(p => _(p.blockers).map(bId => getProvinceById(bId)).every(p => p.isPlayerOwned)).value();
			var scoutedAndNotOwnedArray = _(accData.campaign.provinces).filter(p => p.isScouted && !p.isPlayerOwned).value();

			var list = $('#campaign-list').empty();
			_.each(_.concat(provinceToScoutArray, scoutedAndNotOwnedArray), p => {
				var remainingResourcesToPay = _(p.segmentArray).filter(s => !s.isPlayerOwned).map(s => _.map(s.resourcePrice.resources, (v, k) => ({good_id: k, value: v}))).flatten().groupBy('good_id').mapValues(g => _.sumBy(g, 'value')).map((v, k) => ({good_id: k, value: v})).value();
				var tr = $(templates.campaign({
					eraName: getEraName(p.era),
					name: p.name,
					isScouted: p.isScouted,
					isPlayerOwned: p.isPlayerOwned,
					reward: getRevardType(_.get(p, 'reward.type', null))
				}));
				tr.find('.scouting-cost').empty().append(renderSingleRes({
					good_id: 'money',
					value: p.scoutingCost,
				}));
				tr.find('.remaining-cost').empty().append(renderFlattenCityResource(remainingResourcesToPay, true));
				if (p.reward) {
					let rEl = tr.find('.reward');
					if (p.reward.loot) {
						rEl.empty().append(renderFlattenCityResource(convertCityResource(p.reward.loot)));
					} else if (p.reward.goodDeposit) {
						rEl.empty().append(renderSingleRes({
							good_id: p.reward.goodDeposit.goodsId,
							value: 1
						}));
					} else if (p.reward.type === 'expansion') {
						rEl.empty().append(renderSingleRes({
							good_id: 'expansions',
							value: p.reward.amount
						}));
					}
				}
				list.append(tr);
			});

			var scoutInfo = $('#scout-info').empty();
			if (accData.campaign.scout.__timeout__ && accData.campaign.scout.__timeout__ > (new Date()).valueOf()) {
				let targetProvince = getProvinceById(accData.campaign.scout.path[accData.campaign.scout.path.length - 1]);
				let info = templates.scoutInfo({
					arrives: getTimeoutDescState(accData.campaign.scout), //moment(accData.campaign.scout.__timeout__).format("YYYY-MM-DD HH:mm:ss"),
					targetProvinceName: targetProvince.name
				});
				scoutInfo.text(info);
			} else {
				scoutInfo.text(templates.scoutInfoIdle({}));
			}
		};

		var calculateStatistics = function() {
			var createUniqNameList = function(arr) {
				return _(arr).map(r => r.resource).flatten().filter(r => r).map(r => r.good_id).uniq().value();
			};
			var createAmountListForGoodId = function(arr, good_id) {
				return _(arr).filter(r => _.find(r.resource, r => r && r.good_id === good_id)).map(r => {
					var foundRes = _.find(r.resource, r => r.good_id === good_id);
					return {
						amount: foundRes ? foundRes.value : 0,
						time: r.time
					};
				}).value();
			};
			var calcStat = function(arr) {
				return Math.round(_(arr).map(ma => ((12 * 60 * 60) / ma.time) * ma.amount).reduce((sum, x) => x + sum, 0) * 10) / 10;
			};

			// Lista aktualnych produkcji
			var currentProductArray = _(accData.buildingList).filter(b => b.state.__class__ === 'ProducingState').map(b => b.state.current_product).value();
			// Lista finalnych produktów
			var revenueArray = _(currentProductArray).map(cp => {
				return {
					resource: convertCityResource(cp.revenue),
					time: cp.production_time
				};
			}).value();
			// Lista wymaganych zasobów do produkcji
			var requirementArray = _(currentProductArray).filter(cp => cp.requirements).map(cp => {
				return {
					resource: convertCityResource(cp.requirements.resources),
					time: cp.production_time
				};
			}).value();
			var uniqList = _.union(createUniqNameList(revenueArray), createUniqNameList(requirementArray));

			resStatList.empty();
			_.each(uniqList, good_id => {
				var revenueStat = calcStat(createAmountListForGoodId(revenueArray, good_id));
				var requirementStat = calcStat(createAmountListForGoodId(requirementArray, good_id));
				var d = findResDefinition(good_id);
				var tr = $(templates.resStat({
					name: d.name,
					income: revenueStat,
					expediture: requirementStat,
					saldo: revenueStat - requirementStat,
					imgPath: getIconPath(good_id),
					amount: getAmount(good_id)
				}));
				tr.appendTo(resStatList);
			});
		};
		getJSON('/ctrl/getAccountData', ajaxParam, result => {
			spinner.css('display', '');
			accData = result;
			var loggedIn = !!accData.resourceList;
			if (loggedIn) {
				renderGoodsBuildingList();
				renderProductionBuildingList();
				renderResidentialBuildingList();
				renderResourceList();
				renderCultureBuildingList($('#culture-list'), 'culture');
				renderCultureBuildingList($('#decorations-list'), 'decoration');
				eraSelect.find('option[value=' + accData.user_data.era.era + ']').prop('selected', true);
				renderTechnologyList(accData.user_data.era.era);
				renderGreatBuildingList();
				renderSocialList();
				renderTradeList();
				renderAcceptedOfferList();
				renderCampaign();

				var hasRaw = function(good_id) {
					return  !!_.some(accData.resourceList, r => r.good_id === 'raw_' + good_id);
				};

				var ol = _(accData.otherOffersArray).filter(
					to => hasRaw(to.need.good_id) && !hasRaw(to.offer.good_id) && getResEraIndex(to.need.good_id) <= getResEraIndex(to.offer.good_id) && to.need.value < to.offer.value
				).value();
				console.log(ol);
				//accListSelect.find(`option[value='${ajaxParam.username};${ajaxParam.world}']`).text(`${ajaxParam.username} (${ajaxParam.world}) - ${accData.world.name}, ${getEraName(accData.user_data.era.era)}`);
			}
			accountDataDiv.toggle(loggedIn);
			startAccountBtn.prop('disabled', loggedIn);
			setupPauseButton(!loggedIn || !accData.paused);
			refreshBtn.prop('disabled', false);
			calculateStatistics();
			spinner.css('display', 'none');
		});
	};

	var refreshBtn = $('#refreshAccount').click(() => {
		refreshBtn.prop('disabled', true);
		pauseAccountBtn.prop('disabled', true);
		getAccountData();
	});

	var findBuildingDefinition = function(id) {
		return _.find(definitions.city_entities, ce => {
			return ce.id === id;
		});
	};

	var findResDefinition = function(id) {
		if (id.startsWith('raw_')) {
			id = id.substr(4);
		}
		var foundDef = _.find(definitions.resDefinitions, rd => {
			return rd.id === id;
		});
		if (!foundDef) {
			switch (id) {
			case 'population': foundDef = {name: 'Populacja'}; break;
			case 'seasonal_resource_vo': foundDef = {name: 'Produkt sezonowy'}; break;
			case 'premium': foundDef = {name: 'Diamenty'}; break;
			case 'expansions': foundDef = {name: 'Rozszerzenie terenu'}; break;
			case 'happiness': foundDef = {name: 'Zadowolenie'}; break;
			case 'tavern_silver': foundDef = {name: 'Srebrniki'}; break;
			}
			if (foundDef) {
				foundDef.id = id;
			} else {
				console.log(`Nie znaleziono definicji dla ${id}`);
			}
		}
		return foundDef;
	};

	var getResEraIndex = good_id => {
		var rd = findResDefinition(good_id);
		if (rd) {
			return getEraIndex(rd.era);
		}
		return -1;
	};

	var getIconPath = function(good_id) {
		var prefix = '/asset/';
		var ext = '.png';
		if (good_id.startsWith('raw')) {
			return prefix + 'raw/' + definitions.iconFilenameMappings[good_id] + ext;
		}
		if (isSpecialProduct(good_id)) {
			if (good_id == 'seasonal_resource_vo') {
				return prefix + 'icon_fine_small/icon_fine_random' + ext;
			}
			return prefix + 'icon_fine_small/icon_fine_' + good_id + ext;
		}
		return prefix + 'icon_fine_small/' + definitions.iconFilenameMappings[good_id] + ext;
	};

	var getDefinitionsAndAccountData = function() {
		if (!definitions || !definitions.city_entities) {
			getJSON('/ctrl/getDefinitions', ajaxParam, result => {
				definitions = result;
				setupEfficencyTab();
				getAccountData();
			});
		} else {
			getAccountData();
		}
	};
	var getAccountList = function() {
		getJSON('/ctrl/getAccountList', result => {
			accountList = result;
			_.each(accountList, account => {
				accListSelect.append($(templates.option({
					name: `${account.username} (${account.world}) - ${account.worldName || ''}, ${account.eraName || ''}`,
					value: `${account.username};${account.world}`
				})));
			});
			accListSelect.trigger('change');
		});
	};
	getAccountList();
});