/**
 * LearningGraphTemplate
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {

            // ####################################################
            // 
            DataProviders: {
                learningGraphTaskTemplates: {
                    idProperty: 'learningGraphTemplateTaskId',

                    indices: [
                    ],

                    InstanceProto: {
                        /**
                         * NOTE: The LearningGraphTemplate and all its TaskTemplates and TaskDepndencies must be cached for this to work
                         */
                        getParent: function(node) {
                            var pathId = this.learningGraphTemplateId;
                            
                        }
                    }
                }
            },
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
                return sequelize.define('LearningGraphTaskTemplate', {
                    learningGraphTemplateTaskId: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    learningGraphTemplateId: {
                        type: DataTypes.INTEGER.UNSIGNED,
                        allowNull: false
                    },

                    title: DataTypes.STRING(256),
                    description: DataTypes.TEXT,
                    isRequired: DataTypes.BOOLEAN,
                    ownerType: DataTypes.INTEGER.UNSIGNED,

                    proofTypeId: {
                        type: DataTypes.INTEGER.UNSIGNED,
                        // references: {
                        //     model: 'ProofType',
                        //     key: 'proofTypeId'
                        // }
                    }
                },{
                    freezeTableName: true,
                    tableName: 'LearningGraphTaskTemplate',

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
                learningGraphTaskTemplates: {
                    idProperty: 'learningGraphTemplateId',

                    members: {
                        onRemovedObject: function(user) {
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
                                include: Shared.User.userAssociations,
                                where: {},

                                // ignore sensitive attributes
                                attributes: Shared.User.visibleUserAttributes
                            };

                            if (queryInput.uid) {
                                queryData.where.uid = queryInput.uid;
                            }
                            else if (queryInput.facebookID) {
                                queryData.where.facebookID = queryInput.facebookID;
                            }
                            else if (queryInput.userName) {
                                queryData.where.userName = queryInput.userName;
                            }
                            else {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

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
    })
});