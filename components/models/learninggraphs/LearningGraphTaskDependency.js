/**
 * LearningGraphTaskDependency
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {

            // ####################################################
            // DataProviders

            DataProviders: {
                learningGraphTaskDependencies: {
                    idProperty: 'learningGraphTaskDependencyId',

                    hasHostMemorySet: 1,

                    indices: [
                        {
                            key: ['learningGraphTemplateId']
                        },
                        {
                            name: 'children',
                            key: ['learningGraphTemplateId', 'fromTaskTemplateId']
                        },
                        {
                            name: 'parents',
                            key: ['learningGraphTemplateId', 'toTaskTemplateId']
                        }
                    ],

                    InstanceProto: {
                        getParent: function() {
                            var graphId = this.learningGraphTemplateId;
                            var taskTemplates = Shared.DataProvider.memorySets.learningGraphTaskTemplates;

                            return taskTemplates.byId[this.fromTaskTemplateId];
                        },

                        getChild: function() {
                            var graphId = this.learningGraphTemplateId;
                            var taskTemplates = Shared.DataProvider.memorySets.learningGraphTaskTemplates;

                            return taskTemplates.byId[this.toTaskTemplateId];
                        },
                    }
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
                return sequelize.define('LearningGraphTaskDependency', {
                    learningGraphTaskDependencyId: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    learningGraphTemplateId: {
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
                    tableName: 'LearningGraphTaskDependency',

                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, 
                                    ['learningGraphTemplateId']),

                                SequelizeUtil.createIndexIfNotExists(tableName, 
                                    ['fromTaskTemplateId', 'toTaskTemplateId'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            
            DataProviders: {
                learningGraphTaskDependencies: {
                    members: {

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