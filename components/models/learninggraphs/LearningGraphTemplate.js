/**
 * LearningGraphTemplate
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Includes: [
        'LearningGraphTaskTemplate',
        'LearningGraphTaskDependency'
    ],

    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {

            // ####################################################
            // DataProviders

            DataProviders: {
                learningGraphTemplates: {
                    idProperty: 'learningGraphTemplateId',

                    hasHostMemorySet: 1,

                    indices: [
                    ],

                    // InstanceProto: {
                    // },

                    members: {
                        getObjectNow: function(queryInput) {
                            return this.byId[queryInput];
                        },

                        getObjectsNow: function(queryInput) {
                            return this.list;
                        },
                    }
                }
            },

            OwnerType: squishy.makeEnum({
                All: 1,
                Group: 2,
                Individual: 3
            }),

            initBase: function() {
            },

            Private: {
            	__ctor: function() {
                },

            	createLearningGraphTemplate: function(lpTemplateDef) {
            		// simulate DB insertion
            		lpTemplateDef.learningGraphTemplateId = ++lastId;

            		if (lpTemplateDef.taskTemplates) {
            			var taskTemplates = lpTemplateDef.taskTemplates;
                        var taskTemplatesById = {};

                        lpTemplateDef.taskTemplates = {
                            list: taskTemplates,
                            byId: taskTemplatesById
                        };

            			//delete lpTemplateDef.taskTemplates;

                        // prepare all taskTemplates
                        for (var iTaskTemplate = 0; iTaskTemplate < taskTemplates.length; ++iTaskTemplate) {
                            var taskTemplate = taskTemplates[iTaskTemplate];
                            taskTemplatesById[taskTemplate.taskTemplateId] = taskTemplate;
                            taskTemplate.taskTemplateId = ++lastTaskTemplateId;

                            taskTemplate.learningGraphTemplateId = lpTemplateDef.learningGraphTemplateId;
                        }

                        // prepare adjacency list for task dependency graph
                        lpTemplateDef.taskDependencyEdges = [];
                        for (var iTaskTemplate = 0; iTaskTemplate < taskTemplates.length; ++iTaskTemplate) {
                            var taskTemplate = taskTemplates[iTaskTemplate];
                            if (taskTemplate.requiredTaskIds) {
                                for (var iTaskId = 0; iTaskId < taskTemplate.requiredTaskIds.length; ++iTaskId) {
                                    var requiredTaskId = taskTemplate.requiredTaskIds[iTaskId];
                                    lpTemplateDef.taskDependencyEdges.push({
                                        from: requiredTaskId,
                                        to: taskTemplate.taskTemplateId
                                    });
                                };
                            }
                        }
            		}

                    this.learningGraphTemplates.list.push(lpTemplateDef);
                    this.learningGraphTemplates.byId[taskTemplate.learningGraphTemplateId] = lpTemplateDef;

            		return Promise.resolve(lpTemplateDef);
            	},

	            genTestData: function() {
	                var OwnerType = this.Shared.OwnerType;

                    // TODO: Proofs
	                this.TaskProofTypes = [{
	                	name: '',
	                	description: '',
	                	contentTypes: '',
	                	isOptional: false // TODO: really?
	                }];


	                this.createLearningGraphTemplate({
	                    title: 'Scratch: Getting started!',
	                    description: 'hello',
	                    isEnabled: true,
	                    ownerType: OwnerType.Individual,
	                    startTime: null,
	                    endTime: null,

	                    taskTemplates: [{
	                        title: 'Task #1',
	                        description: 'Task #1 description',
	                        isRequired: true,

	                        proofTypeId: 0
	                    },{
	                        title: 'Task #2',
	                        description: 'Task #2 description',
	                        isRequired: true,

	                        proofTypeId: 0,
                            
                            requiredTaskIds: [1]
	                    },{
	                        title: 'Task #3',
	                        description: 'Task #3 description',
	                        isRequired: true,

	                        proofTypeId: 0,
                            
                            requiredTaskIds: [2]
	                    }],

                        // TODO: Who has this been assigned to? (teacher-centric)
                        // TODO: Who may choose this path? (student self-organization + optional paths)
                        usersWithAccess: [],
                        groupsWithAccess: [],

	                    learningGraphOutcomes: [{
	                        // TODO?
	                    }]
	                });
	            },
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
                return sequelize.define('LearningGraphTemplate', {
                    learningGraphTemplateId: {type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},

                    title: DataTypes.STRING(256),
                    description: DataTypes.TEXT,
                    isEnabled: DataTypes.BOOLEAN,
                    ownerType: DataTypes.INTEGER.UNSIGNED,
                    // startTime: 
                    // endTime:

                },{
                    freezeTableName: true,
                    tableName: 'LearningGraphTemplate',

                    classMethods: {
                        onBeforeSync: function(models) {
                            models.LearningGraphTaskTemplate.belongsTo(models.LearningGraphTemplate,
                                { foreignKey: 'learningGraphTemplateId' , as: 'learningGraphTemplate', foreignKeyConstraint: true,
                                    onDelete: 'CASCADE', onUpdate: 'CASCADE'});
                            models.LearningGraphTemplate.hasMany(models.LearningGraphTaskTemplate,
                                { foreignKey: 'learningGraphTemplateId' , as: 'taskTemplates', constraints: false});

                            models.LearningGraphTaskDependency.belongsTo(models.LearningGraphTemplate, 
                                { foreignKey: 'learningGraphTemplateId' , as: 'learningGraphTemplate', foreignKeyConstraint: true,
                                    onDelete: 'CASCADE', onUpdate: 'CASCADE'});
                            models.LearningGraphTemplate.hasMany(models.LearningGraphTaskDependency, 
                                { foreignKey: 'learningGraphTemplateId' , as: 'learningGraphTaskDependencies', constraints: false});

                            // This.includes = [{
                            //     model: models.LearningGraphTaskTemplate,
                            // },{
                            //     model: models.LearningGraphTaskDependency,
                            // }];
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
                learningGraphTemplates: {
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
                                include: Shared.LearningGraphTemplate.includes,
                                where: {}
                            };

                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            var queryData = {
                                include: Shared.LearningGraphTemplate.includes,
                                where: {}
                            };
                            
                            return queryData;
                        }
                    }
                }
            },
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function () {
                ThisComponent = this;
            },
    	};
    })
});