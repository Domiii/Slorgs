/**
 * ActionLogEntry stores all access to important Public functions
 */
"use strict";

var NoGapDef = require('nogap').Def;


var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';
var SequelizeUtil = require(libRoot + 'SequelizeUtil');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
        	NotificationEventType: squishy.makeEnum({
        		'NewActivityStarted': 1,
        		'NewActivityStageStarted': 2,
                'ProblemPublished': 3,
                'CollaboratorApprovedOrRejectedProblem': 4,
        		'SolutionPublished': 5,
        		'ScoreChanged': 6,
                /**
                 * Problem has been edited. This includes problems that:
                 * 1. Are owned by user's group
                 * 2. Problems that user is collaborating on [TODO]
                 * 3. Problems the user or group have subscribed to [TODO]
                 */
                'ProblemEdited': 7,
                'SolutionEdited': 8,
                'NewComment': 9,

        		/**
        		 * Staff wants to share something with everyone
        		 */
        		'Broadcast': 10
        	}),
            

        	NotificationTargetType: squishy.makeEnum({
        		'All': 1,
        		'OneUser': 2,
        		'OneGroup': 3,
        		'Users': 4,
        		'Groups': 5
        	}),


        	NotificationTargetSettings: {
        		'All': {
        			createNotificationTargets: function(entry) {
        				return [{
        					targetAll: 1
        				}];
        			}
        		},
        		'OneUser': {
        			createNotificationTargets: function(entry) {
        				if (isNaNOrNull(entry.targetUid)) {
        					return makeError('Missing or invalid `targetUid`.');
        				}
        				return [{
        					targetUid: entry.targetUid
        				}];
        			}
        		},
        		'OneGroup': {
        			createNotificationTargets: function(entry) {
        				if (isNaNOrNull(entry.targetGid)) {
        					return makeError('Missing or invalid `targetGid`.');
        				}
        				return [{
        					targetGid: entry.targetGid
        				}];
        			}
        		},
        		'Users': {
        			createNotificationTargets: function(entry) {
        				if (!(entry.targetUid instanceof Array)) {
        					return makeError('Missing or invalid `targetUid`.');
        				}

        				var targets = [];
        				for (var i = 0; i < entry.targetUid.length; ++i) {
        					var uid = entry.targetUid[i];
        					targets.push({
	        					targetUid: uid
	        				});
        				};
        				return targets;
        			}
        		},
        		'Groups': {
        			createNotificationTargets: function(entry) {
        				if (!(entry.targetGid instanceof Array)) {
        					return makeError('Missing or invalid `targetGid`.');
        				}

        				var targets = [];
        				for (var i = 0; i < entry.targetGid.length; ++i) {
        					var gid = entry.targetGid[i];
        					targets.push({
	        					targetGid: gid
	        				});
        				};
        				return targets;
        			}
        		}
        	},

        	__ctor: function() {
        		var NotificationEventType = this.NotificationEventType;
        		var NotificationTargetType = this.NotificationTargetType;

	        	this.NotificationEventSettings = { list: [
	        		{
                        eventTypeName: 'NewActivityStarted',
	        			parameters: {
	        				activtyId: {
                                dataProvider: 'activities'
                            }
	        			},
	        			targetType: NotificationTargetType.All,
                        createUrlPath: function(notification) {
                            return 'Activity/' + notification.args.activtyId;
                        }
	        		},
                    {
                        eventTypeName: 'NewActivityStageStarted',
	        			parameters: {
	        				activtyId: {
                                dataProvider: 'activities'
                            }
	        			},
	        			targetType: NotificationTargetType.All,
                        createUrlPath: function(notification) {
                            return 'Activity/' + notification.args.activtyId;
                        }
	        		},
                    {
                        eventTypeName: 'ProblemPublished',
	        			parameters: {
	        				itemId: {
                                dataProvider: 'Problem_Items'
                            }
	        			},
	        			targetType: NotificationTargetType.All,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/p/' + notification.args.itemId;
                        }
	        		},
                    {
                        eventTypeName: 'CollaboratorApprovedOrRejectedProblem',
	        			parameters: {
	        				collaboratorGid: {
                                dataProvider: 'groups'
                            },
                            problemId: {
                                dataProvider: 'Problem_Items'
                            },
                            approvalStatus: 'Sequelize.INTEGER.UNSIGNED'
	        			},
	        			targetType: NotificationTargetType.OneGroup,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/p/' + notification.args.problemId;
                        },
                        getNotificationMessage: function(notification) {
                            var keyName = notification.args.approvalStatus > 0 ? 'CollaboratorApprovedProblem' : 
                                'CollaboratorRejectedProblem';
                            var key = 'notifications.message.' + keyName;

                            return Shared.Localizer.Default.lookUp(key);
                        }
	        		},
                    {
                        eventTypeName: 'SolutionPublished',
	        			parameters: {
	        				itemId: {
                                dataProvider: 'Solution_Items'
                            }
	        			},
	        			targetType: NotificationTargetType.OneGroup,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/s/' + notification.args.itemId;
                        }
	        		},
                    {
                        eventTypeName: 'ScoreChanged',
	        			parameters: {
	        				gid: {
                                dataProvider: 'groups'
                            }
	        			},
	        			targetType: NotificationTargetType.OneGroup
	        		},
                    {
                        eventTypeName: 'ProblemEdited',
                        parameters: {
                            editorUid: {
                                dataProvider: 'users'
                            },
                            itemId: {
                                dataProvider: 'Problem_Items'
                            }
                        },
                        targetType: NotificationTargetType.OneGroup,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/p/' + notification.args.itemId;
                        }
                    },
                    {
                        eventTypeName: 'SolutionEdited',
                        parameters: {
                            editorUid: {
                                dataProvider: 'users'
                            },
                            itemId: {
                                // this will actually yield the problem, not the solution (kinda fucked up that way)
                                dataProvider: 'Solution_Items'
                            }
                        },
                        targetType: NotificationTargetType.OneGroup,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/s/' + notification.args.itemId;
                        }
                    },
                    {
                        eventTypeName: 'NewComment',
	        			parameters: {
	        				commentId: {
                                dataProvider: 'comments'
                            },
                            commentorUid: {
                                dataProvider: 'users'
                            },
                            problemId: {
                                dataProvider: 'Problem_Items'
                            },
	        			},
	        			targetType: NotificationTargetType.OneGroup,
                        createUrlPath: function(notification) {
                            return 'Activity/Problem/p/' + notification.args.problemId;
                        }
	        		},
                    {
                        eventTypeName: 'Broadcast',
	        			parameters: {
                            broadcasterUid: {
                                dataProvider: 'users'
                            },
	        				message: 'Sequelize.TEXT'
	        			},
	        			targetType: NotificationTargetType.All,
                        createUrlPath: function(notification) {
                            return null;        // no link yet
                        }
	        		}
	        	]};

                // assign ids
                _.forEach(this.NotificationEventSettings.list, function(entry) {
                    entry.eventType = NotificationEventType[entry.eventTypeName];
                });

                this.NotificationEventSettings.byName = _.indexBy(this.NotificationEventSettings.list, 'eventTypeName');
                this.NotificationEventSettings.byId = _.indexBy(this.NotificationEventSettings.list, 'eventType');
        	},

            serializeArgs: function(args) {
                try {
                    return JSON.stringify(args);
                }
                catch (err) {
                    console.error(err, makeError('error.internal', 'Could not serialize args: ' + args));
                }
            },

            deserializeArgs: function(argsString) {
                try {
                    if (!argsString || !argsString.length) {
                        return null;
                    }
                    return JSON.parse(argsString);
                }
                catch (err) {
                    console.error(err, makeError('error.internal', 'Could not parse args: ' + argsString));
                }
            },

            getNotificationMessage: function(notification) {
                var eventType = notification.eventType;
                var settings = this.NotificationEventSettings.byId[eventType];

                if (settings.getNotificationMessage) {
                    return settings.getNotificationMessage(notification);
                }

                var key = 'notifications.message.' + settings.eventTypeName;
                return Shared.Localizer.Default.lookUp(key);
            },

            Private: {
                DataProviders: {
                    notificationEntries: {
                        idProperty: 'notificationEntryId',

                        members: {
                            compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                                return Promise.reject(makeError('error.invalid.request'));
                            },

                            /**
                             * Possible inputs: limit, onlyNew, before
                             */
                            compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                                var user = this.Instance.User.currentUser;
                                if (!user) {
                                	return Promise.reject(makeError('error.invalid.request'));
                                }
                                
                                var maxLimit = 800;
                                var limit = queryInput && queryInput.limit;
                                if (!ignoreAccessCheck && limit > maxLimit) {
                                    limit = maxLimit;
                                }

                                // only retreive entries destined for this user
                                var userConditions = [
                                	{targetAll: 1},
                            		{targetUid: user.uid}
                            	];
                            	if (user.gid) {
                            		userConditions.push({targetGid: user.gid});
                            	}

                                var where = {};
                                if (queryInput && queryInput.since) {
                                    where.notificationEntryId = { gt: queryInput.since };
                                }
                                else if (queryInput && queryInput.before) {
                                    where.notificationEntryId = { lt: queryInput.before };
                                }

                                return {
                                	where: Sequelize.and(
                                        where,
                                        Sequelize.or.apply(Sequelize, userConditions)
                                    ),
                                    limit: limit,
                                    order: [
                                        ['updatedAt', 'DESC'],
                                        ['notificationEntryId', 'DESC']
                                    ]
                                };
                            }
                        }
                    }
                }
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var ThisComponent;

        return {
            __ctor: function () {
                ThisComponent = this;
            },

            initModel: function() {
                /**
                 * User object definition.
                 */
                return sequelize.define('NotificationEntry', {
                    notificationEntryId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    eventType: {type: Sequelize.INTEGER.UNSIGNED},
                    eventGroupSize: {type: Sequelize.INTEGER.UNSIGNED},

                    targetAll: {type: Sequelize.INTEGER.UNSIGNED},
                    targetUid: {type: Sequelize.INTEGER.UNSIGNED},
                    targetGid: {type: Sequelize.INTEGER.UNSIGNED},

                    args: Sequelize.TEXT
                },{
                    freezeTableName: true,
                    tableName: 'bjt_notification',
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.tableName;
                            return Promise.join(
                            );
                        }
                    }
                });
            },

            initHost: function() {
            },

            Private: {
                postNotification: function(entry) {
                    var eventTypeString = entry.eventType;
                    var settings = this.Shared.NotificationEventSettings.byName[eventTypeString];
                    if (!settings) {
                        return Promise.reject(makeError('error.internal', 
                            'Invalid `eventType`: ' + eventTypeString + ' does not exist.'));
                    }

                    // check args against parameters
                    var parameters = settings.parameters;
                    var args = entry.args;
                    for (var parameterName in parameters) {
                        var param = parameters[i];
                        var arg = args[parameterName];
                        if (arg === undefined) {
                            return Promise.reject(makeError('error.internal', 
                                'Missing argument: ' + parameterName));
                        }
                    };

                    var serializedArgs = this.Shared.serializeArgs(args);
                    if (!serializedArgs) return;

                    var targetTypeString = entry.targetType;
                    var targetSettings = this.Shared.NotificationTargetSettings[targetTypeString];
                    if (!targetSettings) {
                        return Promise.reject(makeError('error.internal', 
                            'Invalid `targetType`: ' + targetTypeString + ' does not exist.'));
                    }

                    // create the actual DB objects, one for each target
                    // we call the entire set an "event group"
                    console.log('new log entry: ' + eventTypeString);

                    var dbEntries = targetSettings.createNotificationTargets(entry);
                    if (!(dbEntries instanceof Array)) {
                        // error...
                        // TODO: This is a hackaround. Make this proper.
                        return Promise.reject(dbEntries);
                    }

                    var dbUpdates = [];
                    var eventGroupSize = dbEntries.length;
                    for (var i = 0; i < dbEntries.length; ++i) {
                        var dbEntry = dbEntries[i];
                        dbEntry.eventType = this.Shared.NotificationEventType[eventTypeString];
                        dbEntry.eventGroupSize = eventGroupSize;
                        dbEntry.args = serializedArgs;
                        dbUpdates.push(this.Shared.Model.create(dbEntry));
                    };

                    return Promise.all(dbUpdates)
                    .bind(this)
                    .map(function(notification) {
                        return this.Instance.FacebookApi.sendNotification(notification);
                    });
                },
            },

            Public: {
                broadcastMessage: function(message) {
                    var user = this.Instance.User.currentUser;
                    if (!this.Instance.User.isStaff()) {
                        return Promise.reject(makeError('error.invalid.permissions'));
                    }

                    if (!_.isString(message)) {
                        return Promise.reject(makeError('error.invalid.request'));
                    }

                    return this.Instance.NotificationEntry.postNotification({
                        eventType: 'Broadcast',
                        targetType: 'All',
                        args: {
                            broadcasterUid: user.uid,
                            message: message
                        }
                    }); 
                }
            }
        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {
            requestNotificationData: function() {
                var promises = [];
                var problemRequestsBySolution = {};
                var notificationCache = Instance.NotificationEntry.notificationEntries;

                // add all missing data ids for the given notification
                var collectIdsByDataProviderName = function(notification, addId) {
                    var settings = this.NotificationEventSettings.byId[notification.eventType];
                    var parameters = settings.parameters;

                    for (var parameterName in parameters) {
                        var parameterConfig = parameters[parameterName];
                        if (!parameterConfig || !parameterConfig.dataProvider) continue;
                        
                        var dataProviderName = parameterConfig.dataProvider;
                        var id = notification.args[parameterName];
                        if (isNaNOrNull(id)) {
                            console.error('Missing id for parameter ' + parameterName);
                            debugger;
                        }

                        else if (dataProviderName === 'Solution_Items') {
                            // special treatment -> Get problem (with all solutions) instead
                            problemRequestsBySolution[id] = 1;
                        }
                        else {
                            // add id to set
                            addId(dataProviderName, id);
                        }
                    }
                }.bind(this);

                // get all kinds of default data
                promises.push(Instance.DataProvider.requestDataBatch(notificationCache.list, collectIdsByDataProviderName));

                // add special data requests:
                // TODO: Batch this
                for (var itemId in problemRequestsBySolution) {
                    // add each solution's itemId separately
                    promises.push(Instance.WorkItems.getOwningItem(Instance.ObjectTypes.TypeId.Solution, itemId));
                }

                // request all missing data
                return Promise.all(promises);
            }
        };
    }),
});