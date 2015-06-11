/**
 * LearningPathTaskDependency
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {

            // ####################################################
            // DataProviders

            DataProviders: {
                learningPathTaskDependencies: {
                    idProperty: 'learningPathTaskDependencyId',

                    hasHostMemorySet: 1,

                    indices: [
                    ],
                }
            }

        };
    }),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var SequelizeUtil;

        return {
            __ctor: function () {
                SequelizeUtil = require(ApplicationRoot + 'lib/SequelizeUtil');
            },


            initModel: function() {
                var This = this;
                var DataTypes = Sequelize;

                /**
                 * User object definition.
                 */
                return sequelize.define('LearningPathTaskDependency', {
                    learningPathTaskDependencyId: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    learningPathTemplateId: {
                        type: DataTypes.INTEGER.UNSIGNED
                    },

                    fromTaskTemplateId: {
                        type: DataTypes.INTEGER.UNSIGNED,
                        allowNull: false
                    },

                    toTaskTemplateId: {
                        type: DataTypes.INTEGER.UNSIGNED,
                        allowNull: false
                    },
                    
                    // startTime: 
                    // endTime:

                },{
                    freezeTableName: true,
                    tableName: 'LearningPathTaskDependency',

                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                            );
                        }
                    }
                });
            },

            
            DataProviders: {
                learningPathTaskDependencies: {
                    members: {
                        filterClientObject: function(learningPathTemplate) {
                            // remove sensitive information before sending to client
                        },

                        /**
                         * 
                         */
                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            // Possible input: uid, userName, facebookID
                            if (!queryInput) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var queryData = {
                                include: null,
                                where: {}
                            };

                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            var queryData = {
                                //include: Shared.User.userAssociations,

                                // ignore sensitive attributes
                                attributes: Shared.User.visibleUserAttributes
                            };
                            if (queryInput && queryInput.uid instanceof Array) {
                                queryData.where = {
                                    uid: queryInput.uid
                                };
                            }
                            
                            return queryData;
                        }
                    }
                }
            },
        };
    }),
});