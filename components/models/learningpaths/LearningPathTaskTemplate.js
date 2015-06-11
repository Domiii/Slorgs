/**
 * LearningPathTemplate
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {

            // ####################################################
            // 
            DataProviders: {
                learningPathTaskTemplates: {
                    idProperty: 'learningPathTemplateTaskId',

                    indices: [
                    ],

                    /*InstanceProto: {

                    },*/


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
                return sequelize.define('LearningPathTaskTemplate', {
                    learningPathTemplateTaskId: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    learningPathTemplateId: {
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
                    tableName: 'LearningPathTaskTemplate',

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
                learningPathTaskTemplates: {
                    idProperty: 'learningPathTemplateId',

                    members: {
                        filterClientObject: function(user) {
                            // remove sensitive information before sending to client
                            delete user.secretSalt;
                            delete user.sharedSecret;
                            delete user.facebookToken;

                            return user;
                        },

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